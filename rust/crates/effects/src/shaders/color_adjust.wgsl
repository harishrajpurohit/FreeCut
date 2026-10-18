struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) tex_coord: vec2f,
}

// scalars: x = brightness [-1, 1], y = contrast [-1, 1],
//          z = saturation [-1, 1], w = temperature [-1, 1]
// direction: x = hue shift in degrees, y = vignette [0, 1]
struct EffectUniforms {
    resolution: vec2f,
    direction: vec2f,
    scalars: vec4f,
}

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var input_sampler: sampler;
@group(1) @binding(0) var<uniform> uniforms: EffectUniforms;

fn luma(color: vec3f) -> f32 {
    return dot(color, vec3f(0.2126, 0.7152, 0.0722));
}

fn rotate_hue(color: vec3f, degrees: f32) -> vec3f {
    let angle = radians(degrees);
    let cos_a = cos(angle);
    let sin_a = sin(angle);
    let k = vec3f(0.57735, 0.57735, 0.57735);
    return color * cos_a + cross(k, color) * sin_a + k * dot(k, color) * (1.0 - cos_a);
}

@fragment
fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
    let sample = textureSample(input_texture, input_sampler, input.tex_coord);
    // Texture is premultiplied; work on straight color.
    var rgb = select(sample.rgb / sample.a, vec3f(0.0), sample.a <= 0.0001);

    rgb = rgb + vec3f(uniforms.scalars.x);
    rgb = (rgb - vec3f(0.5)) * (1.0 + uniforms.scalars.y) + vec3f(0.5);
    rgb = mix(vec3f(luma(rgb)), rgb, 1.0 + uniforms.scalars.z);
    rgb = rgb + vec3f(0.1, 0.0, -0.1) * uniforms.scalars.w;
    rgb = rotate_hue(rgb, uniforms.direction.x);

    let centered = input.tex_coord - vec2f(0.5);
    let vignette = 1.0 - uniforms.direction.y * smoothstep(0.25, 0.75, length(centered));
    rgb = clamp(rgb * vignette, vec3f(0.0), vec3f(1.0));

    return vec4f(rgb * sample.a, sample.a);
}
