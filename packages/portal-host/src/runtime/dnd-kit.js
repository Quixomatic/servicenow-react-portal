// utilities:dnd-kit: the host's copy of dnd-kit for widgets (app/visual-board, app/calendar-view),
// on the host's React, so drag state lives in the widget's own tree. Studio's Menus and Designer
// use the same packages from their own chunk (Studio carries its own React copy).
//
//   import { DndContext, useDraggable, useDroppable, KeyboardSensor, PointerSensor, useSensor,
//            useSensors, sortableKeyboardCoordinates, CSS } from 'utilities:dnd-kit';
//
// One namespace: @dnd-kit/core, @dnd-kit/sortable and CSS from @dnd-kit/utilities (no name clashes).
// In a shadow root, pass DndContext `accessibility={{ container }}` with an element inside the
// widget: the screen-reader instructions and live region must sit in the same root as the
// draggables, or their aria-describedby ids don't resolve.
export * from '@dnd-kit/core';
export * from '@dnd-kit/sortable';
export { CSS, useCombinedRefs } from '@dnd-kit/utilities';
