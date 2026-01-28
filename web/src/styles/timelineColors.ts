export const timelineColors = {
  queue: {
    base: "bg-slate-500/50",
    active: "bg-slate-300",
    selected: "bg-slate-200 ring-2 ring-slate-300"
  },
  cpu: {
    base: "bg-sky-500/50",
    active: "bg-sky-400",
    selected: "bg-sky-300 ring-2 ring-sky-300"
  },
  h2d: {
    base: "bg-violet-500/50",
    active: "bg-violet-400",
    selected: "bg-violet-300 ring-2 ring-violet-300"
  },
  compute: {
    base: "bg-emerald-500/60",
    active: "bg-emerald-400",
    selected: "bg-emerald-300 ring-2 ring-emerald-300"
  },
  d2h: {
    base: "bg-fuchsia-500/50",
    active: "bg-fuchsia-400",
    selected: "bg-fuchsia-300 ring-2 ring-fuchsia-300"
  }
}

// TODO: overlay styling for real vs simulated traces (outline vs filled)
// TODO: encode memory-bound vs compute-bound with pattern/outline
