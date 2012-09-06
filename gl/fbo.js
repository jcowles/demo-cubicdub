
Lab.Fbo = Lab.Fbo || {};

Lab.Fbo = function(width, height, interp) {
    this.interp = interp;
    this.width = width;
    this.height = height;
    this.fbo = null;
    this.rbo = null;
    this.tex = null;
    this.texObj = null;
    
    this.bind = function(gl, setViewport) {
        if (typeof(setViewport) == "undefined")
            setViewport = true;
        if (setViewport)
            gl.viewport(0, 0, this.width, this.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    };
    this.unbind = function(gl) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    this.clear = function(gl) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    };

    this.init = function(gl, initData) {
        initData = initData || null;
        this.interp = interp || gl.NEAREST;
        if (this.fbo) gl.deleteFramebuffer(this.fbo);
        if (this.rbo) gl.deleteRenderbuffer(this.rbo);

        this.fbo = gl.createFramebuffer();
        this.rbo = gl.createRenderbuffer();

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);

        this.texObj = new Lab.Texture(this.width, this.height);
        this.texObj.init(gl, initData, gl.RGBA, gl.RGBA, gl.FLOAT, this.interp, this.interp, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
        this.tex = this.texObj.tex;
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tex, 0);

        gl.bindRenderbuffer(gl.RENDERBUFFER, this.rbo);
        
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.rbo);

        if (!gl.isFramebuffer(this.fbo)) {
            throw ("Invalid frame buffer!");
        }

        switch (gl.checkFramebufferStatus(gl.FRAMEBUFFER)) {
        case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
            throw ("Invalid frame buffer: Incomplete attachment");
        case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
            throw ("Invalid frame buffer: missing attachment");
        case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
            throw ("Invalid frame buffer: incomplete dimensions");
        case gl.FRAMEBUFFER_UNSUPPORTED:
            throw ("Invalid frame buffer: unsupported");
        }

        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    };
};



