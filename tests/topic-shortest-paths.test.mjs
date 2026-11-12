import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import track from '../site/topics/shortest-paths.mjs';

// Compile the learner-visible code verbatim in isolated namespaces.
const preamble = `#include <algorithm>
#include <cassert>
#include <deque>
#include <functional>
#include <limits>
#include <queue>
#include <random>
#include <tuple>
#include <utility>
#include <vector>
using namespace std;
using Matrix = vector<vector<long long>>;
using Arc = tuple<int,int,int>;
const long long X = numeric_limits<long long>::max()/4;
template<class G> G build(int n, const vector<Arc>& arcs) {
    G g(n);
    for (auto [a,b,w]:arcs) g[a].push_back({b,w});
    return g;
}
`;
const implementations = track.units.map(u=>'namespace '+u.id.replaceAll('-','_')+'_impl {\n'+u.code+'\n}').join('\n');
const cases = `
Matrix floydOracle(int n,const vector<Arc>& arcs) {
    Matrix d(n,vector<long long>(n,X));
    for (int i=0;i<n;++i) d[i][i]=0;
    for (auto [u,v,w]:arcs) d[u][v]=min(d[u][v],(long long)w);
    for (int k=0;k<n;++k) for(int i=0;i<n;++i) for(int j=0;j<n;++j)
        if(d[i][k]<X && d[k][j]<X) d[i][j]=min(d[i][j], d[i][k]+d[k][j]);
    return d;
}
// Independent path enumeration: no relaxation or heaps in this oracle.
Matrix simplePaths(int n,const vector<Arc>& arcs) {
    Matrix d(n,vector<long long>(n,X));
    for (int s=0;s<n;++s) {
        auto visit=[&](auto&& self,int u,int used,long long cost)->void {
            d[s][u]=min(d[s][u],cost);
            for(auto [a,b,w]:arcs)
                if(a==u && !(used&(1<<b))) self(self,b,used|(1<<b),cost+w);
        };
        visit(visit,s,1<<s,0);
    }
    return d;
}
// Buy every possible edge subset and check reachability, with no junction formula.
long long buy(int n,const vector<Arc>& edges,bool undirected) {
    long long best=X;
    for (int mask=0;mask<(1<<edges.size());++mask) {
        vector<int> reach(n);
        for(int i=0;i<n;++i) reach[i]=1<<i;
        long long cost=0;
        for(int i=0;i<(int)edges.size();++i) if(mask&(1<<i)) {
            auto [a,b,w]=edges[i];
            reach[a]|=1<<b;
            if(undirected) reach[b]|=1<<a;
            cost+=w;
        }
        for(int k=0;k<n;++k) for(int i=0;i<n;++i) if(reach[i]&(1<<k)) reach[i]|=reach[k];
        if((reach[0]&4) && (reach[1]&4)) best=min(best,cost);
    }
    return best;
}

void checkNonnegative(int n,const vector<Arc>& arcs,bool binary) {
    const auto d=simplePaths(n,arcs);
    assert(all_pairs_impl::allPairs(build<all_pairs_impl::Graph>(n,arcs))==d);
    auto multi=build<sources_impl::Graph>(n,arcs);
    auto exits=sources_impl::nearestExit(multi,{0,n-1,n-1});
    auto nearest=sources_impl::shortest(multi,{n-1,0,0}).distance;
    auto none=sources_impl::shortest(multi,{}).distance;
    for(int s=0;s<n;++s) {
        assert(exits[s]==min(d[s][0],d[s][n-1]));
        assert(nearest[s]==min(d[0][s],d[n-1][s]) && none[s]==X);
        if(binary) assert(deque_impl::binaryDistances(build<deque_impl::Graph>(n,arcs),s)==d[s]);
        auto rooted=dijkstra_impl::shortest(build<dijkstra_impl::Graph>(n,arcs),{s});
        assert(rooted.distance==d[s]);
        for(int t=0;t<n;++t) {
            auto path=dijkstra_impl::pathTo(rooted,t);
            if(d[s][t]==X) assert(path.empty());
            else {
                assert(!path.empty() && path.front()==s && path.back()==t && (int)path.size()<=n);
                long long total=0;
                for(int j=1;j<(int)path.size();++j) {
                    long long edge=X;
                    for(auto [a,b,w]:arcs) if(a==path[j-1] && b==path[j]) edge=min(edge,(long long)w);
                    assert(edge<X); total+=edge;
                }
                assert(total==d[s][t]);
            }
            assert(bidirectional_impl::pointToPoint(build<bidirectional_impl::Graph>(n,arcs),s,t)==d[s][t]);
            vector<long long> h(n);
            for(int i=0;i<n;++i) if(i%2 && d[i][t]!=X) h[i]=d[i][t];
            assert(a_star_impl::aStar(build<a_star_impl::Graph>(n,arcs),s,t,h)==d[s][t]);
            long long coupon=X;
            for(auto [a,b,w]:arcs) if(d[s][a]!=X && d[b][t]!=X)
                coupon=min(coupon,d[s][a]+w/2+d[b][t]);
            assert(layered_impl::oneDiscount(build<layered_impl::Graph>(n,arcs),s,t)==coupon);
        }
    }
}
void checkSigned(int n,const vector<Arc>& arcs) {
    auto actualGraph=build<negative_impl::Graph>(n,arcs);
    auto d=floydOracle(n,arcs);
    for(int s=0;s<n;++s) {
        auto r=negative_impl::signedDistances(actualGraph,s);
        for(int t=0;t<n;++t) {
            bool unbounded=false;
            for(int k=0;k<n;++k)
                if(d[s][k]!=X && d[k][k]<0 && d[k][t]!=X) unbounded=true;
            assert(r.minusInfinity[t]==unbounded);
            if(!unbounded) assert(r.d[t]==d[s][t]);
        }
    }
    bool finite=true;
    for(int i=0;i<n;++i) if(d[i][i]<0) finite=false;
    if(finite) assert(all_pairs_impl::allPairs(build<all_pairs_impl::Graph>(n,arcs))==simplePaths(n,arcs));
}
int main() {
    for(int flags=0;flags<729;++flags) {
        int digits=flags;
        vector<Arc> arcs, signedArcs;
        for(int i=0;i<3;++i) for(int j=0;j<3;++j) if(i!=j) {
            int mode=digits%3; digits/=3;
            if(mode) { arcs.emplace_back(i,j,mode-1); signedArcs.emplace_back(i,j,mode==1?-1:2); }
        }
        checkNonnegative(3,arcs,true);
        checkSigned(3,signedArcs);
        assert(three_terminals_impl::sharedRoutes(build<three_terminals_impl::Graph>(3,arcs),0,1,2)==buy(3,arcs,false));
    }
    mt19937 rng(1709);
    for(int trial=0;trial<90;++trial) {
        vector<Arc> arcs, both;
        int n=4+rng()%2;
        for(int m=0;m<8;++m) {
            int a=rng()%n,b=rng()%n,w=rng()%8;
            arcs.emplace_back(a,b,w); both.emplace_back(a,b,w); both.emplace_back(b,a,w);
        }
        checkNonnegative(n,arcs,false);
        auto directed=build<three_terminals_impl::Graph>(n,arcs);
        assert(three_terminals_impl::sharedRoutes(directed,0,1,2)==buy(n,arcs,false));
        assert(three_terminals_impl::connectThree(build<three_terminals_impl::Graph>(n,both),0,1,2)==buy(n,arcs,true));
    }
    auto inconsistent=build<a_star_impl::Graph>(4,{{0,1,3},{0,2,1},{2,1,1},{1,3,3}});
    assert(a_star_impl::aStar(inconsistent,0,3,{0,0,4,0})==5);
    auto crossing=build<bidirectional_impl::Graph>(5,{{0,1,1},{1,4,9},{0,2,2},{2,3,2},{3,4,2}});
    assert(bidirectional_impl::pointToPoint(crossing,0,4)==6);
    checkSigned(4,{{0,1,4},{0,2,0},{2,3,-2},{3,2,1}});
    checkSigned(3,{{0,1,0},{1,1,-1},{1,2,0}});
}
`;

test('published shortest-path C++17 implementations agree with path and edge-subset enumeration', () => {
  const dir=mkdtempSync(join(tmpdir(),'learn-shortest-'));
  try {
    const source=join(dir,'check.cpp'), exe=join(dir,'check');
    writeFileSync(source,preamble+implementations+cases);
    const build=spawnSync('g++',['-std=c++17','-O1',source,'-o',exe],{encoding:'utf8',timeout:90000});
    assert.equal(build.status,0,build.error?.message||build.stderr);
    const run=spawnSync(exe,[],{encoding:'utf8',timeout:30000});
    assert.equal(run.status,0,run.error?.message||run.stderr);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
