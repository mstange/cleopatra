/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

// This file contains actions related to profile loading.

import type { Action, ProfileLoadingStep } from 'firefox-profiler/types';

export function changeLoadProgress(
  profileLoadingStep: ProfileLoadingStep,
  progress: number
): Action {
  return { type: 'CHANGE_LOAD_PROGRESS', profileLoadingStep, progress };
}
