const description = `\
This example demonstrates how to simulate large numbers of particles using a few spatial partitioning methods.
* **Atomic Linked Lists**: Each cell atomically maintains a linked list of resident particles.
* **Counting Sort**: Sorts particles by computing their cell's start offset with a prefix sum.
* **Prefix Sum**: Optimized Counting Sort using a parallel prefix sum with subgroup operations.
* **NSquared**: No spatial sorting, each particle evaluates the forces of every other particle.
`;

export default {
  name: 'Particle Life',
  description: description,
  filename: __DIRNAME__,
  external: {
    url: 'https://gpu-life.silverspace.io?sample',
    sourceURL: 'https://github.com/SilverSpace505/gpu-life',
  },
  sources: [],
};
