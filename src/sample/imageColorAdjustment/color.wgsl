struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoords : vec2<f32>,
};

struct FilterUniforms {
    temp: f32,
    tint: f32,
    vibrance: f32,
    saturation: f32,
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
    var outColor: vec4<f32> = textureColor;

    // Temperature
    if (filterUniforms.temp != 0.0) {
        outColor.r = clamp(outColor.r + (filterUniforms.temp / 100.0), 0.0, 1.0);
    }

    // Tint
    if (filterUniforms.tint != 0.0) {
        outColor.g = clamp(outColor.g + (filterUniforms.tint / 100.0), 0.0, 1.0);
    }

    // Vibrance
    if (filterUniforms.vibrance != 0.0) {
        var average_vibrance: f32 = (outColor.r + outColor.g + outColor.b) / 3.0;
        outColor = vec4<f32>(
            clamp(mix(outColor.r, average_vibrance, -(filterUniforms.vibrance / 100.0)), 0.0, 1.0),
            clamp(mix(outColor.g, average_vibrance, -(filterUniforms.vibrance / 100.0)), 0.0, 1.0),
            clamp(mix(outColor.b, average_vibrance, -(filterUniforms.vibrance / 100.0)), 0.0, 1.0),
            outColor.a
        );
    }

    // Saturation
    if (filterUniforms.saturation != 0.0) {
        var average_saturation: f32 = (outColor.r + outColor.g + outColor.b) / 3.0;
        outColor = vec4<f32>(
            clamp(mix(average_saturation, outColor.r, filterUniforms.saturation / 100.0), 0.0, 1.0),
            clamp(mix(average_saturation, outColor.g, filterUniforms.saturation / 100.0), 0.0, 1.0),
            clamp(mix(average_saturation, outColor.b, filterUniforms.saturation / 100.0), 0.0, 1.0),
            outColor.a
        );
    }

    return vec4<f32>(outColor.rgb, textureColor.a);
}