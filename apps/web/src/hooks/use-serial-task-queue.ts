import { useCallback, useRef } from "react";

type EnqueueTask = <Result>(
  task: () => Promise<Result>,
) => Promise<Result>;

export function useSerialTaskQueue(): EnqueueTask {
  const tail = useRef(Promise.resolve());

  return useCallback((task) => {
    const request = tail.current.then(task);
    tail.current = request.then(
      () => undefined,
      () => undefined,
    );
    return request;
  }, []);
}
