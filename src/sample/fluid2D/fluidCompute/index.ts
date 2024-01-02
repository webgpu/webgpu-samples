import spatialHashWGSL from './spatialHash.wgsl';
import positionsWGSL from './positions.wgsl';
import densityWGSL from './density.wgsl';
import viscosityWGSL from './viscosity.wgsl';
import pressureWGSL from './pressure.wgsl';
import externalForcesWGSL from './externalForces.wgsl';

export {
  spatialHashWGSL as spatialHashShader,
  positionsWGSL as positionsShader,
  densityWGSL as densityShader,
  viscosityWGSL as viscosityShader,
  pressureWGSL as pressureShader,
  externalForcesWGSL as externalForcesShader,
};
