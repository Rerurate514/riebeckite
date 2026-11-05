# Performance

Environment: Windows, Node 24.22.1, pnpm 12.15.0, local SSD.
Command:

```
pnpm benchmark:vault -- --profiles realistic --sizes 100,1000,5000 --scenarios cold,warm,single-edit --repeats 1
```

The first pass produced one clear outlier: 1,000-note single-edit took
15,425 ms while warm took 2,611 ms and cold took 13,884 ms. A three-run
repeat of warm and single-edit at 1,000 notes produced medians of 2,655 ms
and 3,031 ms (min 2,818 ms, max 3,035 ms), so the first value was treated as
measurement noise. Both values are recorded here.

| Notes | Cold | Warm | Single edit | Peak RSS |
| --- | --- | --- | --- | --- |
| 100 | 3,170 ms | 301 ms | 354 ms | 261 MB |
| 1,000 | 13,884 ms | 2,655 ms (3-run median) | 3,031 ms (3-run median) | 440 MB |
| 5,000 | 67,635 ms | 13,222 ms | 14,398 ms | 728 MB |

The 1,000- and 5,000-note values are single samples except for the repeated
1,000-note warm/single-edit pair above. The benchmark README states that these
measurements are environment-dependent and that one sample is not a guarantee.

## Output size

The kept external E2E build (`layout-a/dist`, 59 pages, 44 plugins) contains
106 files and 2.0 MB in total: 59 HTML files (454 KB), 88.5 KB of CSS, and
JavaScript chunks including a 529 KB lazy Vega module and a 69 KB client entry.
These are raw sizes, not compressed transfer sizes.

## Assessment

Cold builds scale roughly linearly with note count. Warm rebuilds and
single-note edits stay well below cold-build cost at every measured size, so
incremental behavior is observable at 5,000 notes. No performance regression
was introduced by the audit fixes; the fixes touch output planning and scaffold
metadata only.
