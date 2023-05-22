struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) texCoords : vec2<f32>,
};

@group(0) @binding(0) var linearSampler: sampler;
@group(0) @binding(1) var imageTexture: texture_2d<f32>;
@group(0) @binding(2) var filterImageTexture: texture_2d<f32>;

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
    var blueColor = textureColor.b * 63.0;

    var quad1: vec2<f32>;
    quad1.y = floor(floor(blueColor) * 0.125);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);

    var quad2: vec2<f32>;
    quad2.y = floor(ceil(blueColor) * 0.125);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);

    var texPos1: vec2<f32>;
    texPos1.x = ((quad1.x * 64.0) +  textureColor.r * 63.0 + 0.5)/512.0;
    texPos1.y = ((quad1.y * 64.0) +  textureColor.g * 63.0 + 0.5)/512.0;

    var texPos2: vec2<f32>;
    texPos2.x = ((quad2.x * 64.0) +  textureColor.r * 63.0 + 0.5)/512.0;
    texPos2.y = ((quad2.y * 64.0) +  textureColor.g * 63.0 + 0.5)/512.0;

    var newColor1 = textureSample(filterImageTexture, linearSampler, texPos1);
    var newColor2 = textureSample(filterImageTexture, linearSampler, texPos2);

    return mix(newColor1, newColor2, fract(blueColor));
}