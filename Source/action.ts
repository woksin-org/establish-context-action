// Copyright (c) woksin-org. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { getInput, setOutput, setFailed, getMultilineInput } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { Logger } from '@woksin/github-actions.shared.logging';

import {
    CurrentVersionFinder,
    IFindCurrentVersion,
    DefinedVersionFinder,
    SemVerVersionSorter
} from './Version';

import { ReleaseTypeExtractor } from './ReleaseType/ReleaseTypeExtractor';
import { ContextEstablishers } from './ContextEstablishers';
import { MergedPullRequestContextEstablisher } from './MergedPullRequestContextEstablisher';
import { BuildContext } from './BuildContext';
import { VersionFromFileVersionFinder } from './Version/VersionFromFileVersionFinder';
import { GitHubTagsVersionFetcher } from './Version/GitHubTagsVersionFetcher';

const logger = new Logger();

run();
/**
 * Runs the action.
 */
export async function run() {
    try {
        const token = getInput('token', { required: true });
        const releaseBranches = getMultilineInput('release-branches', { required: false }) ?? [];
        const prereleaseBranches = getMultilineInput('prerelease-branches', { required: false }) ?? [];
        const currentVersion = getInput('current-version', { required: false }) ?? '';
        const versionFile = getInput('version-file', { required: false }) ?? '';
        const environmentBranch = getInput('environment-branch', { required: false });

        logger.info(`Pushes to branches: [${releaseBranches.concat(prereleaseBranches).join(', ')}] can trigger a release`);
        const octokit = getOctokit(token);
        const releaseTypeExtractor = new ReleaseTypeExtractor(logger);

        let currentVersionFinder: IFindCurrentVersion;

        logger.info('Inputs:');
        logger.info(` release-branches: '${releaseBranches}'`);
        logger.info(` prerelease-branches: '${prereleaseBranches}'`);
        logger.info(` environment-branch: '${environmentBranch}'`);
        logger.info(` currentVersion: '${currentVersion}'`);
        logger.info(` versionFile: '${versionFile}'`);

        if (versionFile.length > 0) {
            logger.info('Using file strategy for finding version');
            currentVersionFinder = new VersionFromFileVersionFinder(versionFile, logger);
        } else if (currentVersion.length > 0) {
            logger.info('Using defined version strategy for finding version');
            currentVersionFinder = new DefinedVersionFinder(currentVersion);
        } else {
            logger.info('Using tag strategy for finding version');
            currentVersionFinder = new CurrentVersionFinder(
                new GitHubTagsVersionFetcher(context, octokit, logger),
                new SemVerVersionSorter(logger),
                logger);
        }

        const contextEstablishers = new ContextEstablishers(
            new MergedPullRequestContextEstablisher(releaseBranches, prereleaseBranches, environmentBranch, releaseTypeExtractor, currentVersionFinder, octokit, logger)
        );
        logger.info('Establishing context');
        const buildContext = await contextEstablishers.establishFrom(context);
        if (buildContext === undefined) {
            logger.debug('No establisher found for context');
            logger.debug(JSON.stringify(context, undefined, 2));
            outputDefault();
        } else {
            outputContext(buildContext);
        }

    } catch (error: any) {
        fail(error);
    }
}

function output(
    shouldPublish: boolean,
    currentVersion?: string,
    releaseType?: string,
    prBody?: string,
    prUrl?: string) {
    logger.info('Outputting: ');
    logger.info(`'should-publish': ${shouldPublish}`);
    logger.info(`'current-version': ${currentVersion}`);
    logger.info(`'release-type': ${releaseType}`);
    logger.info(`'pr-body': ${prBody}`);
    logger.info(`'pr-url': ${prUrl}`);

    setOutput('should-publish', shouldPublish);
    setOutput('current-version', currentVersion ?? '');
    setOutput('release-type', releaseType ?? '');
    setOutput('pr-body', prBody ?? '');
    setOutput('pr-url', prUrl ?? '');
}
function outputContext(context: BuildContext) {
    output(
        context.shouldPublish,
        context.currentVersion,
        context.releaseType,
        context.pullRequestBody,
        context.pullRequestUrl);
}

function outputDefault() {
    output(false);
}

function fail(error: Error) {
    logger.error(error.message);
    setFailed(error.message);
}
