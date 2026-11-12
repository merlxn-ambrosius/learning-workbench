import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import topic from '../site/topics/segment-tree.mjs';

// Build the code that is shown to the learner; use direct scans and copied
// arrays below so the oracles do not depend on the segment-tree algorithms.
const harness = `
#include <numeric>
#include <random>
#include <string>

static long long scan_sum(const std::vector<long long>& a, int l, int r) {
    return std::accumulate(a.begin()+l, a.begin()+r, 0LL);
}

int main() {
    std::mt19937 rng(84713);
    auto pick = [&](int n) { return static_cast<int>(rng() % n); };

    // Concatenation is associative but order-sensitive, exposing wrong right folds.
    for (int n = 0; n <= 19; ++n) {
        std::string s = "abcdefghijklmnopqrs";
        std::vector<std::string> letters;
        for (int i = 0; i < n; ++i) letters.emplace_back(1, s[i]);
        OrderedTree text(letters, std::string{}, std::plus<std::string>{});
        if (n) {
            s[n/2] = 'X';
            text.set(n/2, "X");
        }
        for (int l = 0; l <= n; ++l)
            for (int r = l; r <= n; ++r)
                assert(text.query(l,r) == s.substr(l,r-l));
    }

    for (int n : {0,1,2,5,8,13,31}) {
        std::vector<long long> a(n);
        for (auto& x : a) x = pick(17)-8;
        std::vector<Summary> leaves;
        for (auto x : a) leaves.push_back(singleton(x));
        OrderedTree summaries(leaves, Summary{0,0,0,0}, join_summary);
        OrderedTree sums(a, 0LL, std::plus<long long>{});
        auto min = [](long long x,long long y) {return std::min(x,y);};
        auto max = [](long long x,long long y) {return std::max(x,y);};
        const auto inf = std::numeric_limits<long long>::max();
        const auto neg_inf = std::numeric_limits<long long>::lowest();
        OrderedTree mins(a, inf, min);
        OrderedTree maxs(a, neg_inf, max);
        FirstAtLeast search(a);
        AffineSums changes(a);
        std::vector<long long> lazy_values = a;

        for (int step = 0; step < 100; ++step) {
            if (n) {
                int i = pick(n);
                a[i] = pick(31)-15;
                summaries.set(i, singleton(a[i]));
                sums.set(i,a[i]); mins.set(i,a[i]); maxs.set(i,a[i]);
                search.set(i,a[i]);
            }
            int l = pick(n+1), r = pick(n+1);
            if (r < l) std::swap(l,r);
            // Negative scale, zero assignment and overlapping additions all matter.
            long long slope = pick(3)-1, offset = pick(9)-4;
            changes.update(l,r,{slope,offset});
            for (int i=l; i<r; ++i) lazy_values[i] = slope*lazy_values[i]+offset;
            for (int ql = 0; ql <= n; ++ql) {
                for (int qr = ql; qr <= n; ++qr) {
                    assert(changes.query(ql,qr) == scan_sum(lazy_values,ql,qr));
                    assert(sums.query(ql,qr) == scan_sum(a,ql,qr));
                    assert(mins.query(ql,qr) == std::accumulate(a.begin()+ql,a.begin()+qr,inf,min));
                    assert(maxs.query(ql,qr) == std::accumulate(a.begin()+ql,a.begin()+qr,neg_inf,max));
                    auto summary = summaries.query(ql,qr);
                    long long best=0, pref=0, suff=0;
                    for (int start=ql; start<qr; ++start) {
                        long long running=0;
                        for (int end=start; end<qr; ++end) {
                            running += a[end];
                            best=std::max(best,running);
                            if (start==ql) pref=std::max(pref,running);
                            if (end+1==qr) suff=std::max(suff,running);
                        }
                    }
                    assert(summary.sum == scan_sum(a,ql,qr));
                    assert(summary.pref == pref && summary.suff == suff && summary.best == best);
                    long long need = pick(25)-12;
                    auto it=std::find_if(a.begin()+ql, a.begin()+qr, [&](auto value){return value>=need;});
                    assert(search.first(ql,qr,need) == (it==a.begin()+qr ? -1 : it-a.begin()));
                }
            }
        }
    }

    // Paths can branch from any root; equal handles may be copied without writing.
    for (int n : {0,1,7,17}) {
        std::vector<long long> base(n);
        VersionedSums versions(base);
        std::vector<int> roots{versions.initial_root()};
        std::vector<std::vector<long long>> arrays{base};
        for (int k=0; k<100; ++k) {
            int parent = pick(static_cast<int>(roots.size()));
            auto next = arrays[parent];
            int root = roots[parent];
            if (n && k%3 != 0) {
                int i = pick(n);
                next[i] = pick(41)-20;
                root = versions.set(root,i,next[i]);
            }
            roots.push_back(root);
            arrays.push_back(next);
            for (int v=0; v<=k+1; ++v) {
                int l=pick(n+1), r=pick(n+1);
                if (r<l) std::swap(l,r);
                assert(versions.query(roots[v],l,r) == scan_sum(arrays[v],l,r));
            }
        }
    }
}
`;

test('displayed C++17 segment trees agree with direct models on intervals, transforms, boundaries and branched versions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'learn-segtree-'));
  try {
    const src = join(dir,'segtree.cpp');
    const binary = join(dir,'segtree');
    writeFileSync(src, [...topic.units.map(unit => unit.code), harness].join('\n'));
    const compiled = spawnSync(process.env.CXX || 'g++', ['-std=c++17','-Wall','-Wextra','-pedantic','-O1', src, '-o', binary], {encoding:'utf8',timeout:60000});
    assert.equal(compiled.status,0, compiled.error?.message || compiled.stderr);
    const ran = spawnSync(binary, [], {encoding:'utf8',timeout:20000});
    assert.equal(ran.status,0, ran.error?.message || ran.stderr);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});
