import { getKernelBus } from './kernelBus'
import type { KernelExecution, PublishEventInput } from './kernelTypes'

export async function publishEvent(input: PublishEventInput): Promise<KernelExecution> {
  return getKernelBus().publish(input)
}
