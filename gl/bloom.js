
Lab.Bloom = Lab.Bloom || {};

Lab.Bloom = function(width, height) {
    this._quad = null;
    this.filterCount = 4;
    this.pass0 = new Array();
    this.kernel = new Float32Array([5,6,5]);
    this.width = width;
    this.height = height;
    this.doBlur = true;

    // blur shader
    this.blur = {};
    this.blur.shader     = null;
    this.blur.attribs    = [ "vertex" ];
    this.blur.uniforms   = [ "tex0", "coefficients", "offsetx", "offsety", "huge" ];

    // blt shader
    this.blt = {};
    this.blt.shader      = null;
    this.blt.attribs     = [ "vertex" ];
    this.blt.uniforms    = [ "tex0", "tex1", "tex2", "tex3", "texCount", 
                             "cutoff", "stretchFactor", "colorSep", "invert",
                             "doVignette" ];

    this.init = function(gl, bltShader, blurShader) {
        this._quad = Lab.Geom.makeQuad2D(gl);
        bltShader.checkVars(this.blt.uniforms, this.blt.attribs);
        blurShader.checkVars(this.blur.uniforms, this.blur.attribs);
        this.blt.shader = bltShader;
        this.blur.shader = blurShader;
        var width = this.width;
        var height = this.height;
        var sum = 0;

        for (var i = 0; i < this.kernel.length; i++) {
            sum += this.kernel[i];
        }

        for (var i = 0; i < this.kernel.length; i++) {
            this.kernel[i] /= sum;
        }

        for (var i = 0; i < this.filterCount; i++) {
            // OPT: Make this NEAREST?
            var fbo = new Lab.PingPongBuffer(width, height, this.blt.shader.prog.tex0, gl.LINEAR);
            fbo.init(gl);
            this.pass0[i] = fbo;
            width /= 2;
            height /= 2;
        }
    };
    
    this.blurFunc = function(gl, horizontal, shader) {
        // each fbo will take the existing texture
        // blur it into the dest texture and 
        // and swap, preparing for the next pass
        //var shader = this.blur.shader;
        //shader.bind(gl);

        // set shader params
        gl.uniform1fv(shader.prog.coefficients, this.kernel);
        gl.uniform1f(shader.prog.offsetx, 0);
        gl.uniform1f(shader.prog.offsety, 0);

        var offsetUni = shader.prog.offsety;
        if (horizontal) 
            offsetUni = shader.prog.offsetx;

        //var pp = this.pass0[0];
        //pp.bind(gl, shader.prog.tex0);
        gl.uniform1i(shader.prog.tex0, 0);
        gl.activeTexture(gl.TEXTURE0);
        for (var i = 0; i < this.pass0.length; i++) {
            gl.uniform1i(shader.prog.huge, (i > 0 && horizontal) ? 1 : 0);
            var ppi = this.pass0[i];
            ppi.bind(gl, shader.prog.tex0);

            var offset = 1.2 / ppi.height;
            if (horizontal)
                offset = 1.2 / ppi.width;
            gl.uniform1f(offsetUni, offset);
            this._drawQuad(gl, shader);
        }
    };

    this.downSample = function(gl) {
        this.blt.shader.bind(gl);
        gl.uniform2f(this.blt.shader.prog.colorSep, 0.0,0.0);
        gl.uniform1f(this.blt.shader.prog.stretchFactor, 2.0);
        for (var i = 1; i < this.pass0.length; i++) {
            this.pass0[i].bind(gl, this.blt.shader.prog.tex0);
            this.pass0[i].copy(gl, this.pass0[i-1]._dst);
            this._drawQuad(gl, this.blt.shader);
        }
    };

    this.combine = function(gl, texFinal) {
        var shader = this.blt.shader;
        shader.bind(gl);
        gl.uniform2f(this.blt.shader.prog.colorSep, 0.0,0.0);
        gl.disable(gl.DEPTH_TEST);
        this.pass0[0].bind(gl, shader.prog.tex0, true);
        this.pass0[0].target(gl, texFinal);
        var texAttrib = [shader.prog.tex0,
                         shader.prog.tex1,
                         shader.prog.tex2,
                         shader.prog.tex3 ]
        var texId = [gl.TEXTURE0,
                     gl.TEXTURE1,
                     gl.TEXTURE2,
                     gl.TEXTURE3]
        for (var i = 0; i < this.pass0.length; i++) {
            gl.uniform1i(texAttrib[i], i);
            gl.activeTexture(texId[i]);
            gl.bindTexture(gl.TEXTURE_2D, this.pass0[i]._src);
        }

        gl.uniform1i(shader.prog.texCount, 4);
        gl.uniform1f(shader.prog.cutoff, 0.0);
        this._drawQuad(gl, this.blt.shader);
        this.pass0[0].unbind(gl);

        gl.disable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
    };

    this._drawQuad = function(gl, shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this._quad);
        gl.vertexAttribPointer(shader.prog.vertex, this._quad.itemSize, gl.FLOAT, false, 0,0);
        gl.enableVertexAttribArray(shader.prog.vertex);
        gl.drawArrays(gl.TRIANGLES, 0, this._quad.length);
    };

    this.render = function(gl, sourceTexture, destTexture) {
        gl.disable(gl.DEPTH_TEST);
        this.blt.shader.bind(gl);
        gl.uniform1i(bltShader.prog.doVignette, 0);
        gl.uniform2f(this.blt.shader.prog.colorSep, 0.0,0.0);
        this.pass0[0].bind(gl, this.blt.shader.prog.tex0);
        this.pass0[0].fbo.clear(gl);

        var _this = this;
        Lab.trace("Bloom-CopySrc", function() {
            // copy the source texture in and filter
            _this.pass0[0].copy(gl, sourceTexture);
            gl.uniform1f(_this.blt.shader.prog.cutoff, 0.8);
            gl.uniform1i(_this.blt.shader.prog.texCount, 1);
            _this._drawQuad(gl, _this.blt.shader);
            gl.uniform1f(_this.blt.shader.prog.cutoff, 0.0);
        });

        Lab.trace("Bloom-DownSample", function() {
            _this.downSample(gl);
            for (var i = 0; i < _this.pass0.length; i++) { _this.pass0[i].swap(); }
        });

        if (this.doBlur) {
            Lab.trace("Bloom-VBlur", function() {
                // vertical blur
                _this.blur.shader.bind(gl);
                _this.blurFunc(gl, /*horizontal=*/ false, _this.blur.shader);
                for (var i = 0; i < _this.pass0.length; i++) { _this.pass0[i].swap(); }
            });

            Lab.trace("Bloom-HBlur", function() {
                // horizontal blur
                _this.blurFunc(gl, /*horizontal=*/   true, _this.blur.shader);
                for (var i = 0; i < _this.pass0.length; i++) { _this.pass0[i].swap(); }
            });
        }

        Lab.trace("Bloom-Combine", function() {
            _this.combine(gl, destTexture);
        });

        if (false) {
            // debug
            this.pass0[0].unbind(gl);
            var shd = this.blt.shader;
            shd.bind(gl);
            gl.clear(gl.COLOR_BIT | gl.DEPTH_BIT);
            gl.viewport(0, 0, 1024, 428);
            gl.activeTexture(gl.TEXTURE0)
            gl.uniform1i(shd.prog.tex0, 0);
            gl.uniform1i(shd.prog.combine, 0);
            gl.bindTexture(gl.TEXTURE_2D, destTexture);
            this._drawQuad(gl, shd);
        }
    };
};


