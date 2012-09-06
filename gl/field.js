
Lab.Field = Lab.Field || {};


Lab.Field = function(width, height) {
    this._isInitialized = false;
    this._pp = null;
    this.shader = null;
    this._tex0 = null;
    this._quad = null;
    this.uniforms = [ "tex0", "time", "dt", "init", "debug" ];
    this.attribs = [ "vertex" ];
    this.width = width;
    this.height = height;

    this.init = function(gl, shader, initialValues, flipY) {
        // Three possibilities for initialization:
        //  1) No initialization is needed (dest does not feed into src)
        //  2) Initialization is passed in explicitly via initialValues
        //  3) the shader only reads from dst if the uniform "init" is not set
        if (typeof(flipY) == "undefined") flipY = false;
        this.flipY = flipY;
        this.shader = shader;
        this.shader.checkVars(this.uniforms, this.attribs);
        this._tex0 = this.shader.prog.tex0;
        this._pp = new Lab.PingPongBuffer(this.width, this.height, this._tex0);
        if (flipY) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        }
        this._pp.init(gl, initialValues);

        if (flipY) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        }
        this._quad = Lab.Geom.makeQuad2D(gl);
    };

    this.update = function(gl, time, dt) {
        this.shader.bind(gl);
        this._pp.bind(gl);
        this._pp.fbo.clear(gl);
        this.render(gl, time, dt, false);
        this._pp.unbind(gl);
        this._pp.swap();
        this._isInitialized = true;
    };

    this.render = function(gl, time, dt, debug) {
        if (debug) {
            this.shader.bind(gl);
            gl.uniform1i(this._tex0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._pp._dst);
        }
        gl.uniform1f(this.shader.prog.time, time);
        gl.uniform1f(this.shader.prog.dt, dt);
        gl.uniform1i(this.shader.prog.init, this._isInitialzed ? 0 : 1);
        gl.uniform1i(this.shader.prog.debug, debug ? 1 : 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quad);
        gl.vertexAttribPointer(this.shader.prog.vertex,this._quad.itemSize,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(this.shader.prog.vertex);
        gl.drawArrays(gl.TRIANGLES,0,this._quad.length);
        if (debug) {
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    };

    this.getTex = function() {
        return this._pp._dst;  
    };
};



