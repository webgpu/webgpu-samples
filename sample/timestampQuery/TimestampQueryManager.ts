// Regroups all timestamp-related operations and resources.
export default class TimestampQueryManager {
  // The device may not support timestamp queries, on which case this whole
  // class does nothing.
  timestampSupported: boolean;

  // Number of timestamp counters
  timestampCount: number;

  // The query objects. This is meant to be used in a ComputePassDescriptor's
  // or RenderPassDescriptor's 'timestampWrites' field.
  timestampQuerySet: GPUQuerySet;

  // A buffer where to store query results
  timestampBuffer: GPUBuffer;

  // A buffer to map this result back to CPU
  timestampMapBuffer: GPUBuffer;

  // State used to avoid firing concurrent readback of timestamp values
  hasOngoingTimestampReadback: boolean;

  // Device must have the "timestamp-query" feature
  constructor(device: GPUDevice, timestampCount: number) {
    this.timestampSupported = device.features.has('timestamp-query');
    if (!this.timestampSupported) return;

    this.timestampCount = timestampCount;

    // Create timestamp queries
    this.timestampQuerySet = device.createQuerySet({
      type: 'timestamp',
      count: timestampCount, // begin and end
    });

    // Create a buffer where to store the result of GPU queries
    const timestampByteSize = 8; // timestamps are uint64
    const timestampBufferSize = timestampCount * timestampByteSize;
    this.timestampBuffer = device.createBuffer({
      size: timestampBufferSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
    });

    // Create a buffer to map the result back to the CPU
    this.timestampMapBuffer = device.createBuffer({
      size: timestampBufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    this.hasOngoingTimestampReadback = false;
  }

  // Resolve all timestamp queries and copy the result into the map buffer
  resolveAll(commandEncoder: GPUCommandEncoder) {
    if (!this.timestampSupported) return;

    // After the end of the measured render pass, we resolve queries into a
    // dedicated buffer.
    commandEncoder.resolveQuerySet(
      this.timestampQuerySet,
      0 /* firstQuery */,
      this.timestampCount /* queryCount */,
      this.timestampBuffer,
      0 /* destinationOffset */
    );

    if (!this.hasOngoingTimestampReadback) {
      // Copy values to the mapped buffer
      commandEncoder.copyBufferToBuffer(
        this.timestampBuffer,
        0,
        this.timestampMapBuffer,
        0,
        this.timestampBuffer.size
      );
    }
  }

  // Once resolved, we can read back the value of timestamps
  readAsync(onTimestampReadBack: (timestamps: BigUint64Array) => void): void {
    if (!this.timestampSupported) return;
    if (this.hasOngoingTimestampReadback) return;

    this.hasOngoingTimestampReadback = true;

    const buffer = this.timestampMapBuffer;
    void buffer.mapAsync(GPUMapMode.READ).then(() => {
      const rawData = buffer.getMappedRange();
      const timestamps = new BigUint64Array(rawData);

      onTimestampReadBack(timestamps);

      buffer.unmap();
      this.hasOngoingTimestampReadback = false;
    });
  }
}
