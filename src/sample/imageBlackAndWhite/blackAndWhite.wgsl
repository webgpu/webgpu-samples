struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoords : vec2<f32>,
};

struct FilterUniforms {
    filterStrength: f32,
};

@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> filterUniforms: FilterUniforms;

@vertex
fn vertex_main(
    @location(0) position: vec4<f32>,
    @location(1) texCoords: vec2<f32>
) -> VertexOut
{
    var output: VertexOut;
    output.position = position;
    output.texCoords = texCoords;
    output.texCoords.y = 1. - output.texCoords.y;
    return output;
}

@fragment
fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
{
    var textureColor = textureSample(imageTexture, linearSampler, fragData.texCoords).rgba;
    var gray = 0.2989 * textureColor.r + 0.5870 * textureColor.g + 0.1140 * textureColor.b;
    var color = mix(textureColor.rgb, vec3<f32>(gray, gray, gray), filterUniforms.filterStrength);
    return vec4<f32>(color, textureColor.a);
}