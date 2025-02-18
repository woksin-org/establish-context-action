# [4.0.7] - 2023-9-12[PR: #10](https://github.com/woksin-org/establish-context-action/pull/10)
## Summary

Use npx


# [4.0.6] - 2023-9-12[PR: #9](https://github.com/woksin-org/establish-context-action/pull/9)
## Summary

Use yarn in scripts


# [4.0.5] - 2023-9-12[PR: #8](https://github.com/woksin-org/establish-context-action/pull/8)
## Summary

Install bun


# [4.0.4] - 2023-9-12[PR: #7](https://github.com/woksin-org/establish-context-action/pull/7)
## Summary

Use bun in CI


# [4.0.3] - 2023-9-12[PR: #6](https://github.com/woksin-org/establish-context-action/pull/6)
## Summary

Try fix release workflow


# [4.0.2] - 2023-9-12[PR: #5](https://github.com/woksin-org/establish-context-action/pull/5)
## Summary

Use Bun in CI for quicker builds


# [4.0.1] - 2023-8-11 [PR: #4](https://github.com/woksin-org/establish-context-action/pull/4)
## Summary

Fix workflow


# [4.0.0] - 2023-8-11 [PR: #2](https://github.com/woksin-org/establish-context-action/pull/2)
## Summary

Moves the functionality of woksin-org/increment-version-action into this action for simplification.

### Added

- `new-version` output which is the incremented version based on the release type and the current version.


# [3.0.0] - 2023-8-11 [PR: #1](https://github.com/woksin-org/establish-context-action/pull/1)
## Summary

Summary of the PR here. The GitHub release description is created from this comment so keep it nice and descriptive.

Remember to remove sections that you don't need or use.

### Added

- `release-branches` input which is a list of branches that when merged to a context should be established

### Changed

- `prerelease-branches` input to be a list instead of comma separated list. See Readme for example


# [2.5.7] - 2022-12-5 [PR: #56](https://github.com/dolittle/establish-context-action/pull/56)
## Summary

Fixes the scripts and workflows


# [2.5.6] - 2022-12-5 [PR: #55](https://github.com/dolittle/establish-context-action/pull/55)
## Summary

Attempt to fix


# [2.5.5] - 2022-12-5 [PR: #54](https://github.com/dolittle/establish-context-action/pull/54)
## Summary

Use node16


# [2.5.4] - 2022-12-5 [PR: #53](https://github.com/dolittle/establish-context-action/pull/53)
## Summary
Update dependencies and use latest dolittle typescript packages


# [2.5.3] - 2021-11-25 [PR: #45](https://github.com/dolittle/establish-context-action/pull/45)
## Summary

Trims the spaces around prerelease branch names after splitting on comma to allow specifying:
```yaml
     - name: Establish context
        id: context
        uses: dolittle/establish-context-action@v2
        with:
          prerelease-branches: legolas, gandalf
```
instead of:
```yaml
     - name: Establish context
        id: context
        uses: dolittle/establish-context-action@v2
        with:
          prerelease-branches: legolas,gandalf
```

### Fixed

- Trim spaces around prerelease branch names


# [2.5.2] - 2021-5-18 [PR: #41](https://github.com/dolittle/establish-context-action/pull/41)
## Summary

The main purpose of this PR was to fix an issue we were having when we were releasing fixes while working on a new prerelease in a branch. So for example say we were working on `5.6.0-embeddings` while the latest release was on `5.5.2`. When we merged in a _patch_ to master, the expected new version should be `5.5.3`, but was `5.6.0`.

Factored out the fetching of versions from `CurrentVersionFinder` so that we can write some specs for it, wrote specs, and fixed the implementation. Also cleaned up some documentation to make it all the same (a few different styles floating around), and removed some unused code.

### Added

- `IVersionFetcher` and implementation `GitHubTagsVersionFetcher` using existing code.
- Specifications for `CurrentVersionFinder`

### Fixed

- `CurrentVersionFinder` so that it disregards running prereleases when pulling in a normal release. Also found some other potential small issues that we have not encountered.


