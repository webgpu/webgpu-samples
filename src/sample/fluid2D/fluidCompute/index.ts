import spatialHashWGSL from './spatialHash.wgsl';
import densityPressureWGSL from './densityPressure.wgsl';
import viscosityWGSL from './viscosity.wgsl';
import combineForcesWGSL from './combineForces.wgsl';

export {
  spatialHashWGSL as spatialHashShader,
  densityPressureWGSL as densityPressureShader,
  viscosityWGSL as viscosityShader,
  combineForcesWGSL as combineForcesShader,
};
