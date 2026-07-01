export const timelineColors = {
  // QUEUE — red/rose: visually alarming — waiting is bad
  queue: {
    base: "bg-rose-600/70 border border-rose-500/40",
    active: "bg-rose-400 border border-rose-300 shadow-sm shadow-rose-500/50",
    selected: "bg-rose-300 ring-2 ring-rose-300 border border-rose-200"
  },
  // CPU — sky blue: host-side work
  cpu: {
    base: "bg-sky-500/70 border border-sky-400/40",
    active: "bg-sky-300 border border-sky-200 shadow-sm shadow-sky-400/50",
    selected: "bg-sky-200 ring-2 ring-sky-300 border border-sky-100"
  },
  // H2D — amber/orange: data movement host→device
  h2d: {
    base: "bg-amber-500/70 border border-amber-400/40",
    active: "bg-amber-300 border border-amber-200 shadow-sm shadow-amber-400/50",
    selected: "bg-amber-200 ring-2 ring-amber-300 border border-amber-100"
  },
  // GPU / compute — emerald green: the good stuff, compute work
  compute: {
    base: "bg-emerald-500/80 border border-emerald-400/40",
    active: "bg-emerald-300 border border-emerald-200 shadow-sm shadow-emerald-400/60",
    selected: "bg-emerald-200 ring-2 ring-emerald-300 border border-emerald-100"
  },
  gpu: {
    base: "bg-emerald-500/80 border border-emerald-400/40",
    active: "bg-emerald-300 border border-emerald-200 shadow-sm shadow-emerald-400/60",
    selected: "bg-emerald-200 ring-2 ring-emerald-300 border border-emerald-100"
  },
  // D2H — fuchsia/violet: data movement device→host
  d2h: {
    base: "bg-violet-500/70 border border-violet-400/40",
    active: "bg-violet-300 border border-violet-200 shadow-sm shadow-violet-400/50",
    selected: "bg-violet-200 ring-2 ring-violet-300 border border-violet-100"
  },
  mem: {
    base: "bg-teal-500/70 border border-teal-400/40",
    active: "bg-teal-300 border border-teal-200 shadow-sm shadow-teal-400/50",
    selected: "bg-teal-200 ring-2 ring-teal-300"
  }
}

// Lane legend — used in UI tooltips and the flow map
export const laneLegend: Record<string, { label: string; color: string; desc: string }> = {
  queue: { label: 'QUEUE', color: '#f43f5e', desc: 'Requests waiting for a free GPU concurrency slot. Long QUEUE bars → increase concurrency or reduce RPS.' },
  cpu: { label: 'CPU', color: '#38bdf8', desc: 'Host CPU pre/post processing (tokenization, decoding). Long CPU bars → CPU is the bottleneck.' },
  h2d: { label: 'H2D', color: '#f59e0b', desc: 'Host-to-Device PCIe transfer. Long H2D bars → large input payload or low PCIe bandwidth.' },
  gpu: { label: 'GPU', color: '#34d399', desc: 'On-device compute (attention, matmul). Dense GPU bars with no gaps = high utilization (good).' },
  compute: { label: 'GPU', color: '#34d399', desc: 'On-device compute (attention, matmul). Dense GPU bars with no gaps = high utilization (good).' },
  d2h: { label: 'D2H', color: '#a78bfa', desc: 'Device-to-Host PCIe transfer. Long D2H bars → large output payload or low PCIe bandwidth.' },
  mem: { label: 'MEM', color: '#2dd4bf', desc: 'Memory bandwidth bound operation.' },
}

