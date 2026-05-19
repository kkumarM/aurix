export type LLMModelPreset = {
  id: string
  name: string
  parameters_b: number
  active_parameters_b?: number
  default_context_tokens: number
  typical_input_tokens: number
  typical_output_tokens: number
  size_class: 'small' | 'medium' | 'large'
  notes: string
}

export const llmModelPresets: LLMModelPreset[] = [
  {
    id: 'llama-3-1-8b',
    name: 'Llama 3.1 8B',
    parameters_b: 8,
    default_context_tokens: 8192,
    typical_input_tokens: 1200,
    typical_output_tokens: 300,
    size_class: 'small',
    notes: 'Estimate for a dense 8B-class instruct model.',
  },
  {
    id: 'llama-3-1-70b',
    name: 'Llama 3.1 70B',
    parameters_b: 70,
    default_context_tokens: 8192,
    typical_input_tokens: 1800,
    typical_output_tokens: 450,
    size_class: 'large',
    notes: 'Estimate for a dense 70B-class model; memory pressure is usually dominant on smaller GPUs.',
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    parameters_b: 7,
    default_context_tokens: 8192,
    typical_input_tokens: 900,
    typical_output_tokens: 220,
    size_class: 'small',
    notes: 'Estimate for a dense 7B-class model with moderate context length.',
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    parameters_b: 46.7,
    active_parameters_b: 12.9,
    default_context_tokens: 32768,
    typical_input_tokens: 1600,
    typical_output_tokens: 380,
    size_class: 'medium',
    notes: 'MoE estimate using total parameters and a smaller active-parameter footprint per token.',
  },
]

export const llmModelPresetMap = Object.fromEntries(llmModelPresets.map((preset) => [preset.id, preset]))
