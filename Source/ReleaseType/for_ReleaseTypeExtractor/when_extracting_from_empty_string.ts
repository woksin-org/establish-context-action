// Copyright (c) woksin-org. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { expect } from 'chai';
import { describeThis } from '@woksin/typescript.testing';
import { an_extractor } from './given/an_extractor';

describeThis(__filename, () => {
    const extractor = new an_extractor().extractor;
    const labels: string[] = [];
    const result = extractor.extract(labels);

    it('should return undefined', () => expect(result).to.be.undefined);
});
