const FULLSCREEN_TRIANGLE = new Float32Array([-1, -1, 3, -1, -1, 3]);

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_focus;
  uniform vec2 u_safeCenter;
  uniform float u_safeRadius;
  uniform vec2 u_portalDirection;
  uniform float u_portalIntensity;
  uniform vec3 u_baseColor;
  uniform vec3 u_accentColor;
  uniform float u_momentum;
  uniform float u_dungeonFactor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    uv.y = 1.0 - uv.y;

    vec2 centered = uv - 0.5;
    float aspect = max(0.0001, u_resolution.x / max(1.0, u_resolution.y));
    float distance = length(centered * vec2(aspect, 1.0));
    float vignette = smoothstep(0.85, 0.25, distance);

    float t = u_time * 0.12;
    float cloud = noise(uv * 3.5 + vec2(t * 0.6, t * 0.4));
    cloud += 0.5 * noise(uv * 8.0 - vec2(t * 0.8, t * 0.5));
    cloud = clamp(cloud, 0.0, 1.0);

    vec3 base = mix(u_baseColor, u_accentColor, 0.2 + 0.4 * cloud);
    base *= mix(1.1, 0.8, clamp(u_dungeonFactor, 0.0, 1.0));
    base += (0.12 + 0.18 * clamp(u_dungeonFactor, 0.0, 1.0)) * vec3(noise(uv * 22.0 + u_time * 0.7));

    vec2 focus = vec2(u_focus.x, 1.0 - u_focus.y);
    float heroDist = length((uv - focus) * vec2(aspect, 1.0));
    float heroGlow = exp(-heroDist * (5.5 - 3.0 * clamp(u_momentum, 0.0, 1.0)));
    heroGlow *= 0.65 + 0.45 * sin(u_time * 3.2 + clamp(u_momentum, 0.0, 1.0) * 4.0);
    heroGlow *= (0.35 + 0.9 * clamp(u_momentum, 0.0, 1.0));

    vec3 heroColor = mix(u_accentColor, vec3(1.0, 0.85, 0.4), 0.4 + 0.4 * clamp(u_momentum, 0.0, 1.0));
    base += heroGlow * heroColor;

    vec2 safeCenter = vec2(u_safeCenter.x, 1.0 - u_safeCenter.y);
    if (u_safeRadius > 0.0 && u_safeCenter.x >= 0.0) {
      float safeDist = length((uv - safeCenter) * vec2(aspect, 1.0));
      float ring = smoothstep(u_safeRadius - 0.025, u_safeRadius, safeDist) - smoothstep(u_safeRadius, u_safeRadius + 0.025, safeDist);
      base += ring * vec3(0.18, 0.65, 0.95) * (0.65 + 0.25 * sin(u_time * 2.4));
    }

    if (u_portalIntensity > 0.001) {
      vec2 dirRaw = vec2(u_portalDirection.x, -u_portalDirection.y);
      float dirLen = max(0.0001, length(dirRaw));
      vec2 dir = dirRaw / dirLen;
      vec2 beamDir = centered + vec2(0.0001, 0.0001);
      float beam = pow(max(0.0, dot(normalize(beamDir), dir)), 10.0);
      float sweep = 0.45 + 0.55 * sin(u_time * 1.5);
      base += beam * sweep * clamp(u_portalIntensity, 0.0, 1.0) * vec3(1.0, 0.8, 0.25);
    }

    float star = noise(centered * 120.0 + u_time * 0.3);
    star = step(0.96, star) * 0.4;
    base += star * vec3(0.6, 0.8, 1.0) * (0.2 + 0.8 * clamp(u_momentum, 0.0, 1.0));

    base *= vignette;
    base = clamp(base, 0.0, 1.0);

    gl_FragColor = vec4(base, 0.9);
  }
`;

const DEFAULT_BASE_COLOR = [0.05, 0.07, 0.12];
const DEFAULT_ACCENT_COLOR = [0.2, 0.45, 0.72];

export class WorldWebGLRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl =
      canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }) ||
      canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
    this.supported = Boolean(this.gl);
    this._lost = false;
    this.resolution = [canvas.width || 1, canvas.height || 1];
    this._dpr = window.devicePixelRatio || 1;

    if (!this.supported) {
      return;
    }

    this._initContext();
    if (!this.program) {
      this.supported = false;
      return;
    }
    this._handleContextLost = (event) => {
      event.preventDefault();
      this._lost = true;
    };
    this._handleContextRestored = () => {
      const gl =
        this.canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true }) ||
        this.canvas.getContext('experimental-webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
      if (!gl) {
        this.supported = false;
        return;
      }
      this.gl = gl;
      this._lost = false;
      this._initContext();
      if (!this.program) {
        this.supported = false;
        return;
      }
      this.supported = true;
      this.setSize(this.canvas.clientWidth || this.canvas.width, this.canvas.clientHeight || this.canvas.height, this._dpr);
    };
    canvas.addEventListener('webglcontextlost', this._handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this._handleContextRestored, false);
  }

  setSize(width, height, dpr = 1) {
    if (!this.gl || this._lost) return;
    const safeWidth = Math.max(1, Math.round(width || 1));
    const safeHeight = Math.max(1, Math.round(height || 1));
    const ratio = Math.max(1, dpr || 1);
    const deviceWidth = safeWidth * ratio;
    const deviceHeight = safeHeight * ratio;

    if (this.canvas.width !== deviceWidth || this.canvas.height !== deviceHeight) {
      this.canvas.width = deviceWidth;
      this.canvas.height = deviceHeight;
    }
    if (this.canvas.style) {
      this.canvas.style.width = `${safeWidth}px`;
      this.canvas.style.height = `${safeHeight}px`;
    }
    this.resolution = [deviceWidth, deviceHeight];
    this._dpr = ratio;
    this.gl.viewport(0, 0, deviceWidth, deviceHeight);
  }

  render(state = {}) {
  if (!this.gl || this._lost) return;
  if (!this.program || !this.vertexBuffer) return;

    const width = state.width ?? this.canvas.clientWidth ?? this.canvas.width;
    const height = state.height ?? this.canvas.clientHeight ?? this.canvas.height;
    const dpr = state.dpr ?? this._dpr ?? (window.devicePixelRatio || 1);
    if (width && height) {
      this.setSize(width, height, dpr);
    }

    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.locations.attributes.position);
    gl.vertexAttribPointer(this.locations.attributes.position, 2, gl.FLOAT, false, 0, 0);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const baseColor = Array.isArray(state.baseColor) && state.baseColor.length === 3 ? state.baseColor : DEFAULT_BASE_COLOR;
    const accentColor = Array.isArray(state.accentColor) && state.accentColor.length === 3 ? state.accentColor : DEFAULT_ACCENT_COLOR;

    gl.uniform2f(this.locations.uniforms.resolution, this.resolution[0], this.resolution[1]);
    gl.uniform1f(this.locations.uniforms.time, state.time ?? 0);
    gl.uniform2f(
      this.locations.uniforms.focus,
      state.focus?.x ?? 0.5,
      state.focus?.y ?? 0.5
    );
    gl.uniform2f(
      this.locations.uniforms.safeCenter,
      state.safeCenter?.x ?? -1.0,
      state.safeCenter?.y ?? -1.0
    );
    gl.uniform1f(this.locations.uniforms.safeRadius, state.safeRadius ?? 0);
    gl.uniform2f(
      this.locations.uniforms.portalDirection,
      state.portalDirection?.x ?? 0,
      state.portalDirection?.y ?? 0
    );
    gl.uniform1f(this.locations.uniforms.portalIntensity, state.portalIntensity ?? 0);
    gl.uniform3fv(this.locations.uniforms.baseColor, baseColor);
    gl.uniform3fv(this.locations.uniforms.accentColor, accentColor);
    gl.uniform1f(this.locations.uniforms.momentum, state.momentum ?? 0);
    gl.uniform1f(this.locations.uniforms.dungeonFactor, state.dungeonFactor ?? 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    if (!this.gl) return;
    const gl = this.gl;
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.vertexShader) {
      gl.deleteShader(this.vertexShader);
      this.vertexShader = null;
    }
    if (this.fragmentShader) {
      gl.deleteShader(this.fragmentShader);
      this.fragmentShader = null;
    }
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', this._handleContextLost);
      this.canvas.removeEventListener('webglcontextrestored', this._handleContextRestored);
    }
    this.supported = false;
  }

  _initContext() {
    const gl = this.gl;
    if (!gl) return;

    this.vertexShader = this._compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    this.fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!this.vertexShader || !this.fragmentShader) {
      this.program = null;
      this.supported = false;
      return;
    }
    this.program = this._linkProgram(this.vertexShader, this.fragmentShader);
    if (!this.program) {
      this.supported = false;
      return;
    }

    this.locations = {
      attributes: {
        position: gl.getAttribLocation(this.program, 'a_position'),
      },
      uniforms: {
        resolution: gl.getUniformLocation(this.program, 'u_resolution'),
        time: gl.getUniformLocation(this.program, 'u_time'),
        focus: gl.getUniformLocation(this.program, 'u_focus'),
        safeCenter: gl.getUniformLocation(this.program, 'u_safeCenter'),
        safeRadius: gl.getUniformLocation(this.program, 'u_safeRadius'),
        portalDirection: gl.getUniformLocation(this.program, 'u_portalDirection'),
        portalIntensity: gl.getUniformLocation(this.program, 'u_portalIntensity'),
        baseColor: gl.getUniformLocation(this.program, 'u_baseColor'),
        accentColor: gl.getUniformLocation(this.program, 'u_accentColor'),
        momentum: gl.getUniformLocation(this.program, 'u_momentum'),
        dungeonFactor: gl.getUniformLocation(this.program, 'u_dungeonFactor'),
      },
    };

  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, FULLSCREEN_TRIANGLE, gl.STATIC_DRAW);
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      console.warn('[WorldWebGLRenderer] Shader compile error:', info);
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  _linkProgram(vertexShader, fragmentShader) {
    const gl = this.gl;
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      console.warn('[WorldWebGLRenderer] Program link error:', info);
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }
}
