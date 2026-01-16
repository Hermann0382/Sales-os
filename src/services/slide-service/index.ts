/**
 * Slide Service Module
 *
 * Exports all slide-related services and utilities
 */

export { slideService } from './slide-service';
export type {
  SlideWithTemplate,
  RenderedSlide,
  GetSlidesInput,
  RenderSlidesInput,
  CreateSlideInstanceInput,
  UpdateSlideInstanceInput,
  RecordSlideTimingInput,
} from './slide-service';

export {
  buildParameterContext,
  renderSlideContent,
  substituteParameters,
  formatValue,
  getValueByPath,
  extractParameterPaths,
  validateParameterContext,
} from './parameter-engine';
export type {
  ParameterContext,
  ProspectContext,
  CallContext,
  AgentContext,
  RenderedSlideContent,
  ParameterSlot,
} from './parameter-engine';
