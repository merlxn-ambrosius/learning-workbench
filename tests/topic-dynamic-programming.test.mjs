import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import topic from '../site/topics/dynamic-programming.mjs';

// Execute the exact learner-facing C++ against direct enumeration or path sums.
// Each check enumerates candidate objects, independently of the displayed recurrence.
const oracle = `
#include <cassert>
#include <iostream>
#include <functional>
#include <limits>
#include <numeric>
#include <random>

int main() {
    std::mt19937 gen(67349);
    auto pick = [&](int n) { return static_cast<int>(gen() % n); };
    auto fail = [](const char* family, int example) {
        std::cerr << family << " mismatched case " << example << "\\n";
        std::exit(1);
    };
    for (int t = 0; t < 180; ++t) {
        int n = pick(8);
        std::vector<std::array<long long,3>> a(n);
        for (auto& row:a) for (auto& x:row) x = pick(20) - 12;
        long long truth = std::numeric_limits<long long>::lowest();
        std::function<void(int,int,long long)> all = [&](int d, int previous, long long value) {
            if (d == n) {truth = std::max(truth,value); return;}
            for (int next = 0; next < 3; ++next)
                if (next != previous) all(d + 1,next,value + a[d][next]);
        };
        all(0,-1,0);
        auto [score, plan] = best_schedule(a);
        if (score != truth || static_cast<int>(plan.size()) != n) fail("schedule", t);
        long long actual = 0;
        for (int i=0; i<n; ++i) {
            if (plan[i]<0 || plan[i]>=3 || (i && plan[i]==plan[i-1])) fail("schedule witness",t);
            actual += a[i][plan[i]];
        }
        if (score != actual) fail("schedule score", t);
    }
    for (int t = 0; t < 170; ++t) {
        std::vector<std::pair<int,long long>> items(pick(5));
        for (auto& [w,v]: items) {w=1+pick(5); v=pick(12)-3;}
        int capacity=pick(11);
        for (Supply supply: {Supply::one,Supply::unlimited}) {
            long long best=0;
            std::function<void(int,int,long long)> all = [&](int i,int free,long long score) {
                if (i==static_cast<int>(items.size())) {best=std::max(best,score); return;}
                auto [w,v]=items[i];
                int max_count=supply==Supply::one ? std::min(1,free/w) : free/w;
                for (int count=0; count<=max_count; ++count) all(i+1,free-count*w,score+count*v);
            };
            all(0,capacity,0);
            if (best_pack(items,capacity,supply)!=best) fail("knapsack",t);
        }
    }
    // Enumerate every ordered word reaching the target; sorting the word
    // gives a genuine multiset oracle independently of either loop ordering.
    for (int mask=0;mask<32;++mask) for (int target=0;target<=10;++target) {
        std::vector<int> coins;
        for(int i=0;i<5;++i) if(mask & (1<<i)) coins.push_back(i+1);
        std::shuffle(coins.begin(),coins.end(),gen);
        int count=0;
        std::vector<int> word;
        std::set<std::vector<int>> bags;
        std::function<void(int)> words = [&](int rem) {
            if(rem==0) {
                ++count;
                auto bag=word; std::sort(bag.begin(),bag.end()); bags.insert(bag);
                return;
            }
            for(int c:coins) if(c<=rem) {word.push_back(c); words(rem-c); word.pop_back();}
        };
        words(target);
        if(coin_ways(coins,target,CountAs::sequences)!=count ||
           coin_ways(coins,target,CountAs::multisets)!=static_cast<int>(bags.size()))
            fail("coin counting",mask*11+target);
    }
    // Fibonacci F(51) is 20,365,011,074; this case exercises the modulus.
    if (coin_ways({1,2},50,CountAs::sequences) != 365010934) fail("coin modulo",50);
    for(int t=0;t<90;++t) {
        std::vector<long long> piles(pick(8)); for(auto& x:piles) x=pick(10);
        long long truth=std::numeric_limits<long long>::max();
        std::function<void(const std::vector<long long>&,long long)> moves =
            [&](const std::vector<long long>& state,long long spent) {
                if(state.size()<2) {truth=std::min(truth,spent);return;}
                for(size_t i=1;i<state.size();++i) {
                    auto next=state;
                    next[i-1]+=next[i]; next.erase(next.begin()+i);
                    moves(next,spent+next[i-1]);
                }
            };
        moves(piles,0);
        if(merge_line(piles)!=truth) fail("adjacent merges",t);
    }
    for(int t=0;t<220;++t) {
        const int n=1+pick(12); Tree g(n);
        std::vector<long long> demand(n);
        for(auto& w:demand) w=pick(7);
        for(int v=1;v<n;++v) {
            int u=pick(v),len=pick(8); g[u].push_back({v,len}); g[v].push_back({u,len});
        }
        auto costs=distance_costs(g,demand);
        for(int root=0;root<n;++root) {
            long long direct=0;
            std::function<void(int,int,long long)> walk = [&](int u,int p,long long distance) {
                direct+=distance*demand[u];
                for(auto [v,w]:g[u]) if(v!=p) walk(v,u,distance+w);
            };
            walk(root,-1,0);
            if(costs[root]!=direct) fail("reroot",t);
        }
    }
    for(int t=0;t<230;++t) {
        const int n=pick(12); std::vector<int> a(n);
        for(auto& x:a) x=pick(7)-3;
        int truth=0;
        for(int mask=0;mask<(1<<n);++mask) {
            int len=0,prev=0; bool valid=true;
            for(int i=0;i<n;++i) if(mask & (1<<i)) {
                if(len && prev>=a[i]) {valid=false;break;}
                ++len; prev=a[i];
            }
            if(valid) truth=std::max(truth,len);
        }
        auto indices=strict_lis_indices(a);
        if(static_cast<int>(indices.size())!=truth) fail("LIS",t);
        for(int i=0;i<truth;++i) {
            const int j=indices[i];
            if(j<0 || j>=n || (i && (indices[i-1]>=j || a[indices[i-1]]>=a[j])))
                fail("LIS witness",t);
        }
    }
}`;

test('published dynamic programming implementations agree with independent small-instance oracles, including witnesses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'learn-dp-'));
  try {
    const cpp = join(dir, 'check.cpp');
    const exe = join(dir, 'check');
    const compile = args => {
      const result = spawnSync('c++', ['-std=c++17', '-Wall', '-Wextra', ...args], {encoding: 'utf8'});
      assert.equal(result.status, 0, result.error?.message ?? result.stderr);
    };
    for (const unit of topic.units) {
      writeFileSync(cpp, unit.code);
      compile(['-fsyntax-only', cpp]);
    }
    writeFileSync(cpp, topic.units.map(unit => unit.code).join('\n') + '\n#include <set>\n#include <cstdlib>\n' + oracle);
    compile(['-O2', cpp, '-o', exe]);
    const run = spawnSync(exe, [], {encoding: 'utf8', timeout: 10000});
    assert.equal(run.status, 0, run.error?.message ?? run.stderr);
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});
