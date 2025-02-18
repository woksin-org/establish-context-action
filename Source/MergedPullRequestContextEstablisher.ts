// Copyright (c) woksin-org. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import path from 'path';
import semver from 'semver';
import { Context } from '@actions/github/lib/context';
import { GitHub } from '@actions/github/lib/utils';
import { ILogger } from '@woksin/github-actions.shared.logging';
import { BuildContext } from './BuildContext';
import { ICanEstablishContext } from './ICanEstablishContext';
import { IReleaseTypeExtractor } from './ReleaseType/IReleaseTypeExtractor';
import { IFindCurrentVersion } from './Version/IFindCurrentVersion';
import { IVersionIncrementor } from './Version';

const nonPrereleaseLabels = [
    'major',
    'minor',
    'patch'
];

/**
 * Represents an implementation of {@link ICanEstablishContext}.
 *
 * @class MergedPullRequestContextEstablisher
 * @implements {ICanEstablishContext}
 */
export class MergedPullRequestContextEstablisher implements ICanEstablishContext {

    /**
     * Initializes a new instance of {@link MergedPullRequestContextEstablisher}.
     * @param {string[]} _prereleaseBranches - A list of branches that should be considered as pre-release branches.
     * @param {string} _environmentBranch - An environment to use for prereleases.
     * @param {IReleaseTypeExtractor} _releaseTypeExtractor - The release type extractor to use for extracting the release type from Pull Request labels.
     * @param {IFindCurrentVersion} _currentVersionFinder - The current version finder to use for finding the current version.
     * @param {IVersionIncrementor} _versionIncrementor - The version incrementor.
     * @param {InstanceType<typeof GitHub>} _github - The github REST api.
     * @param {ILogger} _logger - The logger to use for logging.
     */
    constructor(
        private readonly _releaseBranches: string[],
        private readonly _prereleaseBranches: string[],
        private readonly _environmentBranch: string,
        private readonly _releaseTypeExtractor: IReleaseTypeExtractor,
        private readonly _currentVersionFinder: IFindCurrentVersion,
        private readonly _versionIncrementor: IVersionIncrementor,
        private readonly _github: InstanceType<typeof GitHub>,
        private readonly _logger: ILogger) {
    }

    /**
     * @inheritdoc
     */
    canEstablishFrom(context: Context): [boolean, string?] {
        if (context.payload.pull_request === undefined) return [false, 'Not triggered by a Pull Request'];
        if (context.payload.action !== 'closed') return [false, 'Not triggered by Pull Request closed event'];
        if (!context.payload.pull_request?.merged) return [false, 'Not triggered by Pull Request being merged'];
        const branchName = path.basename(context.ref);
        const correctBranch = (this._releaseBranches.includes(branchName) ||
            branchName === this._environmentBranch ||
            this.isPrereleaseBranch(branchName));
        return correctBranch ? [true] : [false, 'Not merged to a release or prerelease branch'];
    }

    /**
     * @inheritdoc
     */
    async establish(context: Context): Promise<BuildContext> {
        const [canEstablish, cannotEstablishReason] = this.canEstablishFrom(context);
        if (!canEstablish) {
            this._logger.warning(`Cannot establish context. ${cannotEstablishReason}`);
            return {shouldPublish: false};
        }
        this._logger.info('Establishing context for merged pull build');
        const { owner, repo } = context.repo;
        const mergedPr = await this.getMergedPr(owner, repo, context.sha);
        if (!mergedPr) {
            throw new Error(`Could not find a merged pull request with the merge_commit_sha ${context.sha}`);
        }

        const branchName = path.basename(context.ref);
        let prereleaseBranch = this._releaseBranches.includes(branchName) ? undefined : semver.parse(branchName)!;
        let currentVersion = await this._currentVersionFinder.find(prereleaseBranch);
        if (branchName === this._environmentBranch) {
            if (currentVersion.prerelease.length > 0 && currentVersion.prerelease[0].toString() !== this._environmentBranch) {
                prereleaseBranch = semver.parse(`${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}-${branchName}`)!;
                currentVersion = prereleaseBranch;
            } else {
                prereleaseBranch = currentVersion;
            }
        }

        this._logger.info(`Using version '${currentVersion.version}'`);
        const labels = mergedPr?.labels.map(_ => _.name);
        this._logger.info(`PR has the following labels: '${labels}'`);

        const releaseType = prereleaseBranch !== undefined
            ? 'prerelease'
            : this._releaseTypeExtractor.extract(labels);
        if (releaseType === undefined) {
            this._logger.info('Found no release type label on pull request');
            return {
                shouldPublish: false,
                pullRequestBody: mergedPr.body ?? undefined,
                pullRequestUrl: mergedPr.html_url,
            };
        }
        if (prereleaseBranch === undefined && !nonPrereleaseLabels.includes(releaseType)) {
            throw new Error(`When merging to release branch with a release type label it should be one of [${nonPrereleaseLabels.join(', ')}]`);
        }
        return {
            shouldPublish: true,
            releaseType,
            currentVersion: currentVersion.version,
            newVersion: this._versionIncrementor.increment(currentVersion.version, releaseType),
            pullRequestBody: mergedPr.body ?? undefined,
            pullRequestUrl: mergedPr.html_url
        };
    }

    private async getMergedPr(owner: string, repo: string, sha: string) {
        this._logger.debug(`Trying to get merged PR with merge_commit_sha: ${sha}`);
        const mergedPr = await this._github.paginate(
            this._github.rest.pulls.list,
            { owner, repo, state: 'closed', sort: 'updated', direction: 'desc' }
        ).then(data => data.find(pr => pr.merge_commit_sha === sha));
        return mergedPr;
    }

    private isPrereleaseBranch(branchName: string) {
        const branchAsSemver = semver.parse(branchName);
        if (branchAsSemver === null) {
            this._logger.debug(`Branch: '${branchName}' is not a prerelease branch`);
            return false;
        }
        const prerelease = branchAsSemver.prerelease;
        if (!prerelease || prerelease.length === 0) {
            this._logger.debug(`Branch: '${branchName}' is not a prerelease branch`);
            return false;
        }
        const prereleaseId = prerelease[0];
        this._logger.debug(`Checking if configured prerelease branch for prerelease id ${prereleaseId}`);
        for (const prereleaseBranch of this._prereleaseBranches) {
            if (prereleaseId === prereleaseBranch) return true;
        }
        return false;
    }
}
