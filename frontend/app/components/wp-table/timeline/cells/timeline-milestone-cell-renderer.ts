import * as moment from 'moment';
import {$injectNow} from '../../../angular/angular-injector-bridge.functions';
import {WorkPackageResourceInterface} from '../../../api/api-v3/hal-resources/work-package-resource.service';
import {calculatePositionValueForDayCountingPx, RenderInfo, timelineElementCssClass} from '../wp-timeline';
import {LabelPosition, TimelineCellRenderer} from './timeline-cell-renderer';
import {
  classNameFarRightLabel, classNameHideOnHover, classNameHoverStyle,
  classNameLeftLabel, classNameRightContainer, classNameRightHoverLabel, classNameRightLabel,
  classNameShowOnHover,
  WorkPackageCellLabels
} from './wp-timeline-cell';
import Moment = moment.Moment;

interface CellMilestoneMovement {
  // Target value to move milestone to
  date?:moment.Moment;
}

export class TimelineMilestoneCellRenderer extends TimelineCellRenderer {
  public get type():string {
    return 'milestone';
  }

  public isEmpty(wp:WorkPackageResourceInterface) {
    const date = moment(wp.date as any);
    const noDateValue = _.isNaN(date.valueOf());
    return noDateValue;
  }

  public displayPlaceholderUnderCursor(ev:MouseEvent, renderInfo:RenderInfo):HTMLElement {
    const days = Math.floor(ev.offsetX / renderInfo.viewParams.pixelPerDay);

    const placeholder = document.createElement('div');
    placeholder.className = 'timeline-element milestone';
    placeholder.style.pointerEvents = 'none';
    placeholder.style.height = '1em';
    placeholder.style.width = '1em';
    placeholder.style.left = (days * renderInfo.viewParams.pixelPerDay) + 'px';

    const diamond = document.createElement('div');
    diamond.className = 'diamond';
    diamond.style.backgroundColor = '#DDDDDD';
    diamond.style.left = '0.5em';
    diamond.style.height = '1em';
    diamond.style.width = '1em';
    placeholder.appendChild(diamond);

    return placeholder;
  }

  /**
   * Assign changed dates to the work package.
   * For generic work packages, assigns start and due date.
   *
   */
  public assignDateValues(workPackage:WorkPackageResourceInterface,
                          labels:WorkPackageCellLabels,
                          dates:CellMilestoneMovement) {

    this.assignDate(workPackage, 'date', dates.date!);
    this.updateLabels(true, labels, workPackage);
  }

  /**
   * Handle movement by <delta> days of milestone.
   */
  public onDaysMoved(workPackage:WorkPackageResourceInterface,
                     dayUnderCursor:Moment,
                     delta:number,
                     direction:'left' | 'right' | 'both' | 'create' | 'dragright') {

    const initialDate = workPackage.date;
    let dates:CellMilestoneMovement = {};

    if (initialDate) {
      dates.date = moment(initialDate).add(delta, 'days');
    }

    return dates;
  }

  public onMouseDown(ev:MouseEvent,
                     dateForCreate:string | null,
                     renderInfo:RenderInfo,
                     labels:WorkPackageCellLabels,
                     elem:HTMLElement):'left' | 'right' | 'both' | 'create' | 'dragright' {

    // check for active selection mode
    if (renderInfo.viewParams.activeSelectionMode) {
      renderInfo.viewParams.activeSelectionMode(renderInfo.workPackage);
      ev.preventDefault();
      return 'both'; // irrelevant
    }

    let direction:'both' | 'create' = 'both';
    this.workPackageTimeline.forceCursor('ew-resize');

    if (dateForCreate) {
      renderInfo.workPackage.date = dateForCreate;
      direction = 'create';
      return direction;
    }

    this.updateLabels(true, labels, renderInfo.workPackage);

    return direction;
  }

  public update(element:HTMLDivElement, labels:WorkPackageCellLabels|null, renderInfo:RenderInfo): boolean {
    const viewParams = renderInfo.viewParams;
    const date = moment(renderInfo.workPackage.date);

    // abort if no date
    if (_.isNaN(date.valueOf())) {
      return false;
    }

    const diamond = jQuery('.diamond', element)[0];

    element.style.width = 15 + 'px';
    element.style.height = 15 + 'px';
    diamond.style.width = 15 + 'px';
    diamond.style.height = 15 + 'px';
    diamond.style.marginLeft = -(15 / 2) + (renderInfo.viewParams.pixelPerDay / 2) + 'px';
    diamond.style.backgroundColor = this.typeColor(renderInfo.workPackage);

    // offset left
    const offsetStart = date.diff(viewParams.dateDisplayStart, 'days');
    element.style.left = calculatePositionValueForDayCountingPx(viewParams, offsetStart) + 'px';

    // Update labels if any
    if (labels) {
      this.updateLabels(false, labels, renderInfo.workPackage);
    }

    this.checkForActiveSelectionMode(renderInfo, diamond);

    return true;
  }

  getMarginLeftOfLeftSide(renderInfo:RenderInfo):number {
    const workPackage = renderInfo.workPackage;
    let start = moment(workPackage.date);
    const offsetStart = start.diff(renderInfo.viewParams.dateDisplayStart, 'days');
    return calculatePositionValueForDayCountingPx(renderInfo.viewParams, offsetStart);
  }

  getMarginLeftOfRightSide(ri:RenderInfo):number {
    return this.getMarginLeftOfLeftSide(ri) + ri.viewParams.pixelPerDay;
  }

  getPaddingLeftForIncomingRelationLines(renderInfo:RenderInfo):number {
    return (renderInfo.viewParams.pixelPerDay / 2) - 1;
  }

  getPaddingRightForOutgoingRelationLines(renderInfo:RenderInfo):number {
    return (15 / 2);
  }

  /**
   * Render a milestone element, a single day event with no resize, but
   * move functionality.
   */
  public render(renderInfo:RenderInfo):HTMLDivElement {
    const element = document.createElement('div');
    element.className = timelineElementCssClass + ' ' + this.type;

    const diamond = document.createElement('div');
    diamond.className = 'diamond';
    element.appendChild(diamond);

    return element;
  }

  createAndAddLabels(renderInfo:RenderInfo, element:HTMLElement):WorkPackageCellLabels {
    // create left label
    const labelLeft = document.createElement('div');
    labelLeft.classList.add(classNameLeftLabel, classNameHideOnHover);
    element.appendChild(labelLeft);

    // create right container
    const containerRight = document.createElement('div');
    containerRight.classList.add(classNameRightContainer);
    element.appendChild(containerRight);

    // create right label
    const labelRight = document.createElement('div');
    labelRight.classList.add(classNameRightLabel, classNameHideOnHover);
    containerRight.appendChild(labelRight);

    // create far right label
    const labelFarRight = document.createElement('div');
    labelFarRight.classList.add(classNameFarRightLabel, classNameHideOnHover);
    containerRight.appendChild(labelFarRight);

    // Create right hover label
    const labelHoverRight = document.createElement('div');
    labelHoverRight.classList.add(classNameRightHoverLabel, classNameShowOnHover, classNameHoverStyle);
    element.appendChild(labelHoverRight);

    const labels = new WorkPackageCellLabels(null, labelLeft, null, labelRight, labelHoverRight, labelFarRight);
    this.updateLabels(false, labels, renderInfo.workPackage);

    return labels;
  }

  protected renderHoverLabels(labels:WorkPackageCellLabels, workPackage:WorkPackageResourceInterface) {
    this.renderLabel(workPackage, labels, 'rightHover', 'date');
  }

  protected updateLabels(activeDragNDrop:boolean,
                         labels:WorkPackageCellLabels,
                         workPackage:WorkPackageResourceInterface) {

    const labelConfiguration = this.wpTableTimeline.getNormalizedLabels(workPackage);

    if (!activeDragNDrop) {
      // normal display

      // Show only one date field if left=start, right=dueDate
      if (labelConfiguration.left === 'startDate' && labelConfiguration.right === 'dueDate') {
        this.renderLabel(workPackage, labels, 'left', null);
        this.renderLabel(workPackage, labels, 'right', 'date');
      } else {
        this.renderLabel(workPackage, labels, 'left', labelConfiguration.left);
        this.renderLabel(workPackage, labels, 'right', labelConfiguration.right);
      }

      this.renderLabel(workPackage, labels, 'farRight', labelConfiguration.farRight);
    }

    // Update hover labels
    this.renderHoverLabels(labels, workPackage);
  }

  protected renderLabel(workPackage:WorkPackageResourceInterface,
                        labels:WorkPackageCellLabels,
                        position:LabelPosition|'leftHover'|'rightHover',
                        attribute:string|null) {
    // Normalize attribute
    if (attribute === 'startDate' || attribute === 'dueDate') {
      attribute = 'date';
    }

    super.renderLabel(workPackage, labels, position, attribute);
  }

}
