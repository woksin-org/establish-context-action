// Copyright (c) Dolittle. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { a_version_incrementor } from '../given/a_version_incrementer';

import { describeThis } from '@woksin/typescript.testing';

describeThis(__filename, () => {
    const version_incrementor = new a_version_incrementor().version_incrementor;
    const version = '0.0.1-preview.1';
    const result = version_incrementor.increment(version, 'patch');

    it('should return the correct version', () => result.should.equal('0.0.1'));
});
