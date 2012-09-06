
Lab.Shader = Lab.Shader || {};

Lab.Shader = function(fsId, vsId, uniforms, attribs) {
    this._vsId = vsId;
    this._fsId = fsId;
    this._attribs = attribs;
    this._uniforms = uniforms;

    this.prog = null;
    this.fs   = null;
    this.vs   = null;
    this.uniforms = [];
    this.attribs  = [];

    this._compile = function(gl, id) {
        var scr = document.getElementById(id);
        if (!scr) {
            throw("object '" + id + "' not found");
        }

        var source = "";
        var k = scr.firstChild;
        while(k) {
            if (k.nodeType == 3) {
                source += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (scr.type == "x-shader/x-fragment") {
            shader = gl.createShader(gl.FRAGMENT_SHADER);
        } else if (scr.type == "x-shader/x-vertex") {
            shader = gl.createShader(gl.VERTEX_SHADER);
        } else {
            throw("Invalid shader type");
        }

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw("Error: '" + id + "': " + gl.getShaderInfoLog(shader));
        }

        return shader;
    };

    this._link = function(gl) {
        var prog = gl.createProgram();
        gl.attachShader(prog, this.vs);
        gl.attachShader(prog, this.fs);
        gl.linkProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw("Link/attach shader step failed: '" 
                    + this._fsId + ", " + this._vsId + "': " 
                    + gl.getShaderInfoLog(shader));
        }

        gl.useProgram(prog);
        return prog;
    };

    this._initUniforms = function(gl) {
        var len = 0;
        for (i in this._uniforms) {
            var uniform = this._uniforms[i];
            this.prog[uniform] = gl.getUniformLocation(this.prog, uniform);
            len++;
            // incase anyone is screwing with the array prototype
            if (len == this._uniforms.length) break;
        }
    };

    this._initAttribs = function(gl) {
        var len = 0;
        for (i in this._attribs) {
            var attrib = this._attribs[i];
            this.prog[attrib] = gl.getAttribLocation(this.prog, attrib);
            //gl.enableVertexAttribArray(this.prog[attrib])
            len++;
            // incase anyone is screwing with the array prototype
            if (len == this._attribs.length) break;
        }
    };

    this.checkVars = function(uniforms, attribs) {
        for (var i = 0; i < uniforms.length; i++) {
            uni = uniforms[i];
            assert(uni in this.prog, "Shader is missing uniform '" + uni + "'");
        }
        for (var i = 0; i < attribs.length; i++) {
            attr = attribs[i];
            assert(attr in this.prog, "Shader is missing attribute '" + attr + "'");
        }
    };

    this.init = function(gl) {
        this.vs = this._compile(gl, this._vsId);
        this.fs = this._compile(gl, this._fsId);
        this.prog = this._link(gl); 
        this._initUniforms(gl);
        this._initAttribs(gl);
    };

    this.bind = function(gl) {
        gl.useProgram(this.prog);
    };
};

