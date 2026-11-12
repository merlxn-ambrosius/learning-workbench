import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import topic from '../site/topics/bit-manipulation.mjs';
import {traceFrontiers} from '../site/topics/frontiers.mjs';

test('the actual C++17 bit references agree with direct enumeration, including the top bit', t=>{
  const dir=mkdtempSync(join(tmpdir(),'learn-bits-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const main=String.raw`
#include <cassert>
#include <set>
#include <random>
int main() {
    auto [a,b]=two_odd({0u,0x80000000u,3,3,7,7});
    assert((a|b)==0x80000000u && (a&b)==0 && a!=b);
    std::mt19937 rng(29);
    for (int trial=0;trial<220;++trial) {
        const int n=1+rng()%8, limit=1<<n;
        std::vector<unsigned> v(n);
        std::vector<unsigned> sums(limit), xors(limit);
        XorBasis basis;
        std::bitset<65> reachable;
        std::vector<std::int64_t> f(limit), expected(limit);
        for (auto& x:v) { x=rng()%21; basis.insert(x); }
        for (auto& x:f) x=int(rng()%13)-6;
        std::uint64_t maximum=0;
        for(int s=0;s<limit;++s){
            for(int i=0;i<n;++i) if(s&(1<<i)){sums[s]+=v[i];xors[s]^=v[i];}
            if(sums[s]<=64) reachable.set(sums[s]);
            maximum=std::max(maximum,std::uint64_t(xors[s]));
            for(int t=0;t<limit;++t) if((s&t)==t) expected[s]+=f[t];
        }
        assert(maximum==basis.maximum() && reachable_sums<64>(v)==reachable);
        assert(subset_totals(f)==expected);
        std::vector<bool> good(limit); for(int i=1;i<limit;++i)good[i]=(rng()%3)!=0;
        // Enumerate unordered partitions by assigning the next element to a bin.
        int answer=n+1;std::vector<int> bins;
        auto brute=[&](auto&& self,int i)->void{
            if(i==n){for(int bin:bins)if(!good[bin])return;answer=std::min(answer,int(bins.size()));return;}
            for(int j=0;j<int(bins.size());++j){bins[j]^=1<<i;self(self,i+1);bins[j]^=1<<i;}
            bins.push_back(1<<i);self(self,i+1);bins.pop_back();
        };
        brute(brute,0);
        assert(minimum_groups(n,good)==(answer>n?-1:answer));
    }
    XorBasis b64;b64.insert(1ULL<<63);b64.insert(3);assert(b64.maximum()==((1ULL<<63)|3));
}
`;
  const path=join(dir,'check.cpp'),binary=join(dir,'check');
  writeFileSync(path,topic.units.map(u=>u.code).join('\n')+'\n'+main);
  execFileSync('g++',['-std=c++17','-O2',path,'-o',binary]);
  execFileSync(binary);
});

test('bidirectional trace stops at the independent path minimum, including early contact and a tie',()=>{
  for(let direct=1;direct<=16;direct++){
    const steps=traceFrontiers(direct), final=steps.at(-1);
    assert.equal(final.best, Math.min(direct,9));
    assert.ok(final.stop);
    assert.ok(steps.slice(0,-1).every(s=>!s.stop));
    if(direct>9) assert.ok(steps.some(s=>s.best===direct&&!s.stop));
  }
});
