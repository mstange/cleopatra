/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect from '../../utils/connect';
import FlameGraphCanvas from './Canvas';
import {
  getCategories,
  getCommittedRange,
  getProfileViewOptions,
  getPreviewSelection,
  getScrollToSelectionGeneration,
} from '../../selectors/profile';
import { selectedThreadSelectors } from '../../selectors/per-thread';
import { getSelectedThreadIndex } from '../../selectors/url-state';
import ContextMenuTrigger from '../shared/ContextMenuTrigger';
import { getCallNodePathFromIndex } from '../../profile-logic/profile-data';
import {
  changeSelectedCallNode,
  changeRightClickedCallNode,
} from '../../actions/profile-view';
import { getIconsWithClassNames } from '../../selectors/icons';
import { BackgroundImageStyleDef } from '../shared/StyleDef';

import type { Thread, CategoryList } from '../../types/profile';
import type { Milliseconds } from '../../types/units';
import type { FlameGraphTiming } from '../../profile-logic/flame-graph';
import type { PreviewSelection } from '../../types/actions';
import type {
  CallNodeInfo,
  IndexIntoCallNodeTable,
} from '../../types/profile-derived';
import type { CallTree } from '../../profile-logic/call-tree';
import type { IconWithClassName } from '../../types/state';

import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

require('./FlameGraph.css');

const STACK_FRAME_HEIGHT = 16;

type StateProps = {|
  +thread: Thread,
  +maxStackDepth: number,
  +timeRange: { start: Milliseconds, end: Milliseconds },
  +previewSelection: PreviewSelection,
  +flameGraphTiming: FlameGraphTiming,
  +callTree: CallTree,
  +callNodeInfo: CallNodeInfo,
  +threadIndex: number,
  +selectedCallNodeIndex: IndexIntoCallNodeTable | null,
  +isCallNodeContextMenuVisible: boolean,
  +scrollToSelectionGeneration: number,
  +icons: IconWithClassName[],
  +categories: CategoryList,
|};
type DispatchProps = {|
  +changeSelectedCallNode: typeof changeSelectedCallNode,
  +changeRightClickedCallNode: typeof changeRightClickedCallNode,
|};
type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class FlameGraph extends React.PureComponent<Props> {
  _viewport: HTMLDivElement | null = null;

  _onSelectedCallNodeChange = (
    callNodeIndex: IndexIntoCallNodeTable | null
  ) => {
    const { callNodeInfo, threadIndex, changeSelectedCallNode } = this.props;
    changeSelectedCallNode(
      threadIndex,
      getCallNodePathFromIndex(callNodeIndex, callNodeInfo.callNodeTable)
    );
  };

  _takeViewportRef = (viewport: HTMLDivElement | null) => {
    this._viewport = viewport;
  };

  _focusViewport = () => {
    if (this._viewport) {
      this._viewport.focus();
    }
  };

  componentDidMount() {
    this._focusViewport();
  }

  _onRightClickedCallNodeChange = (
    callNodeIndex: IndexIntoCallNodeTable | null
  ) => {
    const {
      callNodeInfo,
      threadIndex,
      changeRightClickedCallNode,
    } = this.props;
    changeRightClickedCallNode(
      threadIndex,
      getCallNodePathFromIndex(callNodeIndex, callNodeInfo.callNodeTable)
    );
  };

  render() {
    const {
      thread,
      threadIndex,
      maxStackDepth,
      flameGraphTiming,
      callTree,
      callNodeInfo,
      timeRange,
      previewSelection,
      selectedCallNodeIndex,
      isCallNodeContextMenuVisible,
      scrollToSelectionGeneration,
      icons,
      categories,
    } = this.props;

    const maxViewportHeight = maxStackDepth * STACK_FRAME_HEIGHT;

    return (
      <div className="flameGraphContent">
        {icons.map(({ className, icon }) => (
          <BackgroundImageStyleDef
            className={className}
            url={icon}
            key={className}
          />
        ))}
        <ContextMenuTrigger
          id="CallNodeContextMenu"
          attributes={{
            className: 'treeViewContextMenu',
          }}
        >
          <FlameGraphCanvas
            key={threadIndex}
            // ChartViewport props
            viewportProps={{
              timeRange,
              maxViewportHeight,
              maximumZoom: 1,
              previewSelection,
              startsAtBottom: true,
              disableHorizontalMovement: true,
              viewportNeedsUpdate,
              marginLeft: 0,
              marginRight: 0,
              containerRef: this._takeViewportRef,
            }}
            // FlameGraphCanvas props
            chartProps={{
              thread,
              maxStackDepth,
              flameGraphTiming,
              callTree,
              callNodeInfo,
              categories,
              selectedCallNodeIndex,
              scrollToSelectionGeneration,
              stackFrameHeight: STACK_FRAME_HEIGHT,
              onSelectionChange: this._onSelectedCallNodeChange,
              onRightClick: this._onRightClickedCallNodeChange,
              disableTooltips: isCallNodeContextMenuVisible,
            }}
          />
        </ContextMenuTrigger>
      </div>
    );
  }
}

function viewportNeedsUpdate() {
  // By always returning false we prevent the viewport from being
  // reset and scrolled all the way to the bottom when doing
  // operations like changing the time selection or applying a
  // transform.
  return false;
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    return {
      thread: selectedThreadSelectors.getFilteredThread(state),
      maxStackDepth: selectedThreadSelectors.getCallNodeMaxDepthForFlameGraph(
        state
      ),
      flameGraphTiming: selectedThreadSelectors.getFlameGraphTiming(state),
      callTree: selectedThreadSelectors.getCallTree(state),
      timeRange: getCommittedRange(state),
      previewSelection: getPreviewSelection(state),
      callNodeInfo: selectedThreadSelectors.getCallNodeInfo(state),
      categories: getCategories(state),
      threadIndex: getSelectedThreadIndex(state),
      selectedCallNodeIndex: selectedThreadSelectors.getSelectedCallNodeIndex(
        state
      ),
      isCallNodeContextMenuVisible: getProfileViewOptions(state)
        .isCallNodeContextMenuVisible,
      scrollToSelectionGeneration: getScrollToSelectionGeneration(state),
      icons: getIconsWithClassNames(state),
    };
  },
  mapDispatchToProps: {
    changeSelectedCallNode,
    changeRightClickedCallNode,
  },
  component: FlameGraph,
};

export default explicitConnect(options);
