
Lab.PingPongBuffer = Lab.PingPongBuffer || {};

Lab.PingPongBuffer = function (width, height, uniformTex0, interp, format) {
    this.width = width;
    this.height = height;
    this.fbo;
    this.uniformTex0 = uniformTex0;
    this.interp = interp
    this._src = null;
    this._dst = null;
    this.inputSrc = true;
    this.format = format;

    this.init = function(gl, initialValues) {
        this.format = this.format || gl.RGBA;
        var initBuff = initialValues || new Float32Array(this.width*this.height*4);
        assert(initBuff.length == (this.width*this.height*4), "Invlid initial buffer in ping-pong");
        this.fbo = new Lab.Fbo(this.width, this.height, this.interp);
        this.fbo.init(gl);
        this._dst = this.fbo.tex;
        var tex = gl.createTexture();
        this._src = tex;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.width, this.height, 0, this.format, gl.FLOAT, initBuff);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.fbo.interp);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.fbo.interp);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    this.bind = function(gl, uniTex0, setViewport) {
        this.uniformTex0 = uniTex0 || this.uniformTex0;

        // Ping-Pong update
        // it's faster to switch textures than FBOs
        // so just switch the texture that the one FBO points at 

        // bind the dest texture 
        this.fbo.bind(gl, setViewport);
        //gl.bindTexture(gl.TEXTURE_2D, this._dst);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this._dst, 0);

        if (this.inputSrc) {
            // bind the source texture 
            gl.uniform1i(this.uniformTex0, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._src);
        }
    };

    this.copy = function(gl, texture) {
        // bind the input texture over the _src texture
        // when the buffer swaps, it will be as if the 
        // input texture was the _src
        gl.uniform1i(this.uniformTex0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
    };

    this.target = function(gl, texture) {
        // render to the target instead of _dst
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    };

    this.unbind = function(gl) {
        gl.bindTexture(gl.TEXTURE_2D, null);
        this.fbo.unbind(gl);
    }

    this.swap = function() {
        var __tmp = this._src;
        this._src = this._dst;
        this._dst = __tmp;
    };
};


