// Regroups all timestamp-related operations and resources.
export default class TimestampQueryManager {
  // The device may not support timestamp queries, on which case this whole
  // class does nothing.
  timestampSupported: boolean;

  // The query objects. This is meant to be used in a ComputePassDescriptor's
  // or RenderPassDescriptor's 'timestampWrites' field.
  timestampQuerySet: GPUQuerySet;

  // A buffer where to store query results
  timestampBuffer: GPUBuffer;

  // A buffer to map this result back to CPU
  timestampMapBuffer: GPUBuffer;

  // Last times
  timestamps: number[];

  // Device must have the "timestamp-query" feature
  constructor(device: GPUDevice, timestampPairCount: number) {
    this.timestampSupported = device.features.has('timestamp-query');
    if (!this.timestampSupported) return;

    this.timestamps = Array(timestampPairCount).fill(0);

    // Create timestamp queries
    this.timestampQuerySet = device.createQuerySet({
      type: 'timestamp',
      count: timestampPairCount * 2, // begin and end
    });

    // Create a buffer where to store the result of GPU queries
    const timestampByteSize = 8; // timestamps are uint64
    this.timestampBuffer = device.createBuffer({
      size: this.timestampQuerySet.count * timestampByteSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.QUERY_RESOLVE,
    });

    // Create a buffer to map the result back to the CPU
    this.timestampMapBuffer = device.createBuffer({
      size: this.timestampBuffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
  }

  // Add both a start and end timestamp.
  addTimestampWrite(
    renderPassDescriptor: GPURenderPassDescriptor,
    pairId: number
  ) {
    if (this.timestampSupported) {
      // We instruct the render pass to write to the timestamp query before/after
      const ndx = pairId * 2;
      renderPassDescriptor.timestampWrites = {
        querySet: this.timestampQuerySet,
        beginningOfPassWriteIndex: ndx,
        endOfPassWriteIndex: ndx + 1,
      };
    }
    return renderPassDescriptor;
  }

  // Resolve all timestamp queries and copy the result into the map buffer
  resolveAll(commandEncoder: GPUCommandEncoder) {
    if (!this.timestampSupported) return;

    // After the end of the measured render pass, we resolve queries into a
    // dedicated buffer.
    commandEncoder.resolveQuerySet(
      this.timestampQuerySet,
      0 /* firstQuery */,
      this.timestampQuerySet.count /* queryCount */,
      this.timestampBuffer,
      0 /* destinationOffset */
    );

    if (this.timestampMapBuffer.mapState === 'unmapped') {
      // Copy values to the mappable buffer
      commandEncoder.copyBufferToBuffer(
        this.timestampBuffer,
        0,
        this.timestampMapBuffer,
        0,
        this.timestampBuffer.size
      );
    }
  }

  // Read the value of timestamps.
  update(): void {
    if (!this.timestampSupported) return;
    if (this.timestampMapBuffer.mapState !== 'unmapped') return;

    const buffer = this.timestampMapBuffer;
    void buffer.mapAsync(GPUMapMode.READ).then(() => {
      const rawData = buffer.getMappedRange();
      const timestamps = new BigUint64Array(rawData);
      for (let i = 0; i < this.timestamps.length; ++i) {
        const ndx = i * 2;
        // Cast into number. Number can be 9007199254740991 as max integer
        // which is 109 days of nano seconds.
        const elapsedNs = Number(timestamps[ndx + 1] - timestamps[ndx]);
        // It's possible elapsedNs is negative which means it's invalid
        // (see spec https://gpuweb.github.io/gpuweb/#timestamp)
        if (elapsedNs >= 0) {
          this.timestamps[i] = elapsedNs;
        }
      }
      buffer.unmap();
    });
  }
}
