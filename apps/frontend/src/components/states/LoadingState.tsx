interface LoadingStateProps {
  message?: string;
}

function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
      <div className="h-6 w-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      <p className="mt-3 text-sm">{message}</p>
    </div>
  );
}

export default LoadingState;