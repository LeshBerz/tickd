import { useEffect } from "react";
import { Outlet } from "react-router";
import { consumeListFocusRequest, focusTaskInList } from "../detailFocus.ts";
import { useRouteTaskId } from "../useRouteTaskId.ts";
import { StorageBanner } from "./StorageBanner.tsx";
import { TaskDetailPanel } from "./TaskDetailPanel.tsx";

export function TasksLayout() {
  const taskId = useRouteTaskId();

  useEffect(() => {
    if (taskId !== null) {
      return;
    }
    const requestedId = consumeListFocusRequest();
    if (requestedId !== null) {
      focusTaskInList(requestedId);
    }
  }, [taskId]);

  return (
    <div className="flex-1 lg:overflow-y-auto overflow-x-clip flex flex-col lg:flex-row items-center lg:items-stretch w-full lg:pl-16 xl:pl-24 lg:pr-8">
      {/* The list keeps its 44rem width and never moves its left edge; it only yields room
          when the card would otherwise drop below its minimum. */}
      <div
        data-task-column=""
        className={`w-full flex flex-col min-h-full px-4 lg:px-0 py-6 lg:py-10 max-w-[44rem] min-w-0 lg:w-[44rem] lg:shrink${
          taskId === null ? "" : " max-lg:hidden"
        }`}
      >
        <StorageBanner />
        <Outlet />
      </div>
      {taskId === null ? null : <TaskDetailPanel key={taskId} taskId={taskId} />}
    </div>
  );
}
