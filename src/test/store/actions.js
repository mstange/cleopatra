import { assert } from 'chai';
import { blankStore, storeWithProfile } from '../fixtures/stores';
import * as ProfileViewSelectors from '../../content/reducers/profile-view';
import * as TimelineSelectors from '../../content/reducers/timeline-view';
import {
  changeCallTreeSearchString,
  changeHidePlatformDetails,
  addRangeFilter,
  changeInvertCallstack,
  updateProfileSelection,
} from '../../content/actions/profile-view';
import {
  changeFlameChartColorStrategy,
  changeTimelineExpandedThread,
} from '../../content/actions/timeline';
import { receiveProfileFromAddon } from '../../content/actions/receive-profile';
import { getCategoryByImplementation } from '../../content/color-categories';
const { selectedThreadSelectors } = ProfileViewSelectors;

const profile = require('../fixtures/profiles/profile-2d-canvas.json');

describe('actions/profile', function () {
  it('can take a profile from an addon and save it to state', function () {
    const store = blankStore();

    const initialProfile = ProfileViewSelectors.getProfile(store.getState());
    assert.ok(initialProfile, 'A blank profile initially exists');
    assert.lengthOf(initialProfile.threads, 0, 'The blank profile contains no data');
    store.dispatch(receiveProfileFromAddon(profile));
    assert.strictEqual(ProfileViewSelectors.getProfile(store.getState()), profile, 'The passed in profile is saved in state.');
  });
});

describe('selectors/getStackTimingByDepthForFlameChart', function () {
  /**
   * This table shows off how a flame chart gets filtered to JS only, where the number is
   * the stack index, and P is platform code, and J javascript.
   *
   *            Unfiltered             ->             JS Only
   *   0-10-20-30-40-50-60-70-80-90-91      0-10-20-30-40-50-60-70-80-90-91 <- Timing (ms)
   *  ================================     ================================
   *  0P 0P 0P 0P 0P 0P 0P 0P 0P 0P  |     0P 0P 0P 0P 0P 0P 0P 0P 0P 0P  |
   *  1P 1P 1P 1P    1P 1P 1P 1P 1P  |                       1J 1J 1J 1J  |
   *     2P 2P 3P       4J 4J 4J 4J  |                          2J 2J     |
   *                       5J 5J     |                             3P     |
   *                          6P     |                             4J     |
   *                          7P     |
   *                          8J     |
   */

  it('computes unfiltered stack timing by depth', function () {
    const store = storeWithProfile();
    const stackTimingByDepth = selectedThreadSelectors.getStackTimingByDepthForFlameChart(store.getState());
    assert.deepEqual(stackTimingByDepth, [
      { start: [0], end: [91], stack: [0], length: 1 },
      { start: [0, 50], end: [40, 91], stack: [1, 1], length: 2 },
      { start: [10, 30, 60], end: [30, 40, 91], stack: [2, 3, 4], length: 3 },
      { start: [70], end: [90], stack: [5], length: 1 },
      { start: [80], end: [90], stack: [6], length: 1 },
      { start: [80], end: [90], stack: [7], length: 1 },
      { start: [80], end: [90], stack: [8], length: 1 },
    ]);
  });

  it('computes "Hide platform details" stack timing by depth', function () {
    const store = storeWithProfile();
    store.dispatch(changeHidePlatformDetails(true));
    const stackTimingByDepth = selectedThreadSelectors.getStackTimingByDepthForFlameChart(store.getState());

    assert.deepEqual(stackTimingByDepth, [
      { start: [0], end: [91], stack: [0], length: 1 },
      { start: [60], end: [91], stack: [1], length: 1 },
      { start: [70], end: [90], stack: [2], length: 1 },
      { start: [80], end: [90], stack: [3], length: 1 },
      { start: [80], end: [90], stack: [4], length: 1 },
    ]);
  });

  it('uses search strings', function () {
    const store = storeWithProfile();
    store.dispatch(changeCallTreeSearchString('javascript'));
    const stackTimingByDepth = selectedThreadSelectors.getStackTimingByDepthForFlameChart(store.getState());
    assert.deepEqual(stackTimingByDepth, [
      { start: [60], end: [91], stack: [0], length: 1 },
      { start: [60], end: [91], stack: [1], length: 1 },
      { start: [60], end: [91], stack: [4], length: 1 },
      { start: [70], end: [90], stack: [5], length: 1 },
      { start: [80], end: [90], stack: [6], length: 1 },
      { start: [80], end: [90], stack: [7], length: 1 },
      { start: [80], end: [90], stack: [8], length: 1 },
    ]);
  });

  /**
   * The inverted stack indices will not match this chart, as new indices will be
   * generated by the function that inverts the profile information.
   *
   *            Uninverted             ->             Inverted
   *   0-10-20-30-40-50-60-70-80-90-91      0-10-20-30-40-50-60-70-80-90-91 <- Timing (ms)
   *  ================================     ================================
   *  0P 0P 0P 0P 0P 0P 0P 0P 0P 0P  |     1P 2P 2P 3P 0P 1P 4J 5P 8J 4J
   *  1P 1P 1P 1P    1P 1P 1P 1P 1P  |     0P 1P 1P 1P    0P 1P 4P 7P 1P
   *     2P 2P 3P       4J 4J 4J 4J  |        0P 0P 0P       0P 1J 6P 0P
   *                       5J 5J     |                          0P 5J
   *                          6P     |                             4J
   *                          7P     |                             1P
   *                          8J     |                             0P
   */

  it('can handle inverted stacks', function () {
    const store = storeWithProfile();
    store.dispatch(changeInvertCallstack(true));
    const stackTimingByDepth = selectedThreadSelectors.getStackTimingByDepthForFlameChart(store.getState());
    assert.deepEqual(stackTimingByDepth, [
      {
        start: [0, 10, 30, 40, 50, 60, 70, 80, 90],
        end: [10, 30, 40, 50, 60, 70, 80, 90, 91],
        stack: [0, 2, 5, 8, 0, 9, 12, 16, 9],
        length: 9,
      },
      {
        start: [0, 10, 30, 50, 60, 70, 80, 90],
        end: [10, 30, 40, 60, 70, 80, 90, 91],
        stack: [1, 3, 6, 1, 10, 13, 17, 10],
        length: 8,
      },
      {
        start: [10, 30, 60, 70, 80, 90],
        end: [30, 40, 70, 80, 90, 91],
        stack: [4, 7, 11, 14, 18, 11],
        length: 6,
      },
      {
        start: [70, 80],
        end: [80, 90],
        stack: [15, 19],
        length: 2,
      },
      { start: [80], end: [90], stack: [20], length: 1 },
      { start: [80], end: [90], stack: [21], length: 1 },
      { start: [80], end: [90], stack: [22], length: 1 },
    ]);
  });
});

describe('selectors/getFuncStackMaxDepthForFlameChart', function () {
  it('calculates the max func depth and observes of platform detail filters', function () {
    const store = storeWithProfile();
    const allSamplesMaxDepth = selectedThreadSelectors.getFuncStackMaxDepthForFlameChart(store.getState());
    assert.equal(allSamplesMaxDepth, 6);
    store.dispatch(changeHidePlatformDetails(true));
    const jsOnlySamplesMaxDepth = selectedThreadSelectors.getFuncStackMaxDepthForFlameChart(store.getState());
    assert.equal(jsOnlySamplesMaxDepth, 4);
  });

  it('acts upon the current range', function () {
    const store = storeWithProfile();
    store.dispatch(addRangeFilter(0, 20));
    const allSamplesMaxDepth = selectedThreadSelectors.getFuncStackMaxDepthForFlameChart(store.getState());
    assert.equal(allSamplesMaxDepth, 2);
    store.dispatch(changeHidePlatformDetails(true));
    const jsOnlySamplesMaxDepth = selectedThreadSelectors.getFuncStackMaxDepthForFlameChart(store.getState());
    assert.equal(jsOnlySamplesMaxDepth, 0);
  });
});

describe('selectors/getLeafCategoryStackTimingForFlameChart', function () {
  /**
   * This table shows off how stack timings get filtered to a single row by concurrent
   * color categories. P is platform code, J javascript baseline, and I is javascript
   * interpreter.
   *
   *            Unfiltered             ->      By Concurrent Leaf Category
   *   0-10-20-30-40-50-60-70-80-90-91      0-10-20-30-40-50-60-70-80-90-91 <- Timing (ms)
   *  ================================     ================================
   *  0P 0P 0P 0P 0P 0P 0P 0P 0P 0P  |     1P 1P 1P 1P 1P 1P 4J 4J 8I 4J  |
   *  1P 1P 1P 1P    1P 1P 1P 1P 1P  |
   *     2P 2P 3P       4J 4J 4J 4J  |
   *                       5J 5J     |
   *                          6P     |
   *                          7P     |
   *                          8I     |
   */
  it('gets the unfiltered leaf stack timing by implementation', function () {
    const store = storeWithProfile();
    store.dispatch(changeFlameChartColorStrategy(getCategoryByImplementation));
    const leafStackTiming = selectedThreadSelectors.getLeafCategoryStackTimingForFlameChart(store.getState());

    assert.deepEqual(leafStackTiming, [
      {
        start: [0, 60, 80, 90],
        end: [60, 80, 90, 91],
        stack: [1, 4, 8, 4],
        length: 4,
      },
    ]);
  });
});

describe('actions/changeTimelineExpandedThread', function () {
  it('can set one timeline thread as expanded', function () {
    const store = storeWithProfile();
    const threads = ProfileViewSelectors.getThreads(store.getState());

    function isExpanded(thread, threadIndex) {
      return TimelineSelectors.getIsThreadExpanded(store.getState(), threadIndex);
    }

    assert.deepEqual(threads.map(isExpanded), [false, false, false]);

    store.dispatch(changeTimelineExpandedThread(1, true));
    assert.deepEqual(threads.map(isExpanded), [false, true, false]);

    store.dispatch(changeTimelineExpandedThread(2, true));
    assert.deepEqual(threads.map(isExpanded), [false, false, true]);

    store.dispatch(changeTimelineExpandedThread(2, false));
    assert.deepEqual(threads.map(isExpanded), [false, false, false]);
  });
});

describe('actions/updateProfileSelection', function () {
  it('can the update the selection with new values', function () {
    const store = storeWithProfile();

    const initialSelection = ProfileViewSelectors.getProfileViewOptions(store.getState()).selection;
    assert.deepEqual(initialSelection, {
      hasSelection: false,
      isModifying: false,
    });

    store.dispatch(updateProfileSelection({
      hasSelection: true,
      isModifying: false,
      selectionStart: 100,
      selectionEnd: 200,
    }));

    const secondSelection = ProfileViewSelectors.getProfileViewOptions(store.getState()).selection;
    assert.deepEqual(secondSelection, {
      hasSelection: true,
      isModifying: false,
      selectionStart: 100,
      selectionEnd: 200,
    });
  });
});
