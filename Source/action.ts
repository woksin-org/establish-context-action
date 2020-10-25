// Copyright (c) Dolittle. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { getInput, setOutput, setFailed } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { Logger } from '@dolittle/github-actions.shared.logging';

import {
    CurrentVersionFinder,
    IFindCurrentVersion,
    DefinedVersionFinder,
    SemVerVersionSorter
} from './Version';

import { ReleaseTypeExtractor } from './ReleaseType/ReleaseTypeExtractor';
import { ContextEstablishers } from './ContextEstablishers';
import { CascadingContextEstablisher } from './CascadingBuildContextEstablisher';
import { MergedPullRequestContextEstablisher } from './MergedPullRequestContextEstablisher';
import { BuildContext } from './BuildContext';
import { VersionFromFileVersionFinder } from './Version/VersionFromFileVersionFinder';

const logger = new Logger();

run();
export async function run() {
    try {
        const token = getInput('token', { required: true });
        const prereleaseBranches = getInput('prerelease-branches', { required: false })?.split(',') ?? [];
        const currentVersion = getInput('current-version', { required: false }) ?? '';
        const versionFile = getInput('version-file', { required: false }) ?? '';

        logger.info(`Pushes to branches: [master, ${prereleaseBranches.join(', ')}] can trigger a release`);
        const octokit = getOctokit(token);
        const releaseTypeExtractor = new ReleaseTypeExtractor(logger);

        let currentVersionFinder: IFindCurrentVersion;

        if (versionFile.length >= 0) {
            logger.info('Using defined version strategy for finding version');
            currentVersionFinder = new VersionFromFileVersionFinder(versionFile);
        } else if (currentVersion.length >= 0) {
            logger.info('Using defined version strategy for finding version');
            currentVersionFinder = new DefinedVersionFinder(currentVersion);
        } else {
            logger.info('Using tag strategy for finding version');
            currentVersionFinder = new CurrentVersionFinder(
                new SemVerVersionSorter(logger),
                context,
                octokit,
                logger);
        }


        const contextEstablishers = new ContextEstablishers(
            new CascadingContextEstablisher(currentVersionFinder, logger),
            new MergedPullRequestContextEstablisher(prereleaseBranches, releaseTypeExtractor, currentVersionFinder, octokit, logger)
        );
        logger.info('Establishing context');
        const buildContext = await contextEstablishers.establishFrom(context);
        if (buildContext === undefined) {
            logger.debug('No establisher found for context');
            logger.debug(JSON.stringify(context, undefined, 2));
            outputDefault();
        }
        else outputContext(buildContext);

    } catch (error) {
        fail(error);
    }
}

function output(shouldPublish: boolean, cascadingRelease: boolean, currentVersion?: string, releaseType?: string, prereleaseId?: string) {
    logger.info('Outputting: ');
    logger.info(`'should-publish': ${shouldPublish}`);
    logger.info(`'cascading-release': ${cascadingRelease}`);
    logger.info(`'current-version': ${currentVersion}`);
    logger.info(`'release-type': ${releaseType}`);
    setOutput('should-publish', shouldPublish);
    setOutput('cascading-release', cascadingRelease);
    setOutput('current-version', currentVersion ?? '');
    setOutput('release-type', releaseType ?? '');
}
function outputContext(context: BuildContext) {
    output(context.shouldPublish, context.cascadingRelease, context.currentVersion, context.releaseType);
}

function outputDefault() {
    output(false, false);
}

function fail(error: Error) {
    logger.error(error.message);
    setFailed(error.message);
}
