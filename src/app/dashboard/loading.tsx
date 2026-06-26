import { LemniscateLoader } from "@/components/lemniscate-loader";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[480px] w-full items-center justify-center">
      <div
        style={{
          width: "min(28vmin, 148px)",
          aspectRatio: "1",
          color: "var(--color-accent)",
        }}
      >
        <LemniscateLoader />
      </div>
    </div>
  );
}
