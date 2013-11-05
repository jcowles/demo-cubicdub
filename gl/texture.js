
Lab.Texture = Lab.Texture || {};

Lab.Texture = function(width, height) {
    this.tex = null;
    this.width = width;
    this.height = height;
    this.wrapS = null;
    this.wrapT = null;
    this.minFilter = null;
    this.magFilter = null;

    this.init = function(gl, data, intformat, format, type, minFilter, magFilter, wrapS, wrapT) {
        if (this.tex) gl.deleteTexture(this.tex);

        intformat = intformat || gl.RGBA;
        format = format || gl.RGBA;
        type = type || gl.FLOAT;
        this.minFilter = minFilter || gl.LINEAR;
        this.magFilter = magFilter || gl.LINEAR;
        this.wrapS = wrapS || gl.CLAMP_TO_EDGE;
        this.wrapT = wrapT || gl.CLAMP_TO_EDGE;

        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);

        //            target    levels, intformat,    width,  height, border, format,     type, data
        gl.texImage2D(gl.TEXTURE_2D, 0, intformat, this.width, this.height, 0, format, type, data);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, this.wrapT);
    };

    this.bind = function(gl, textureTarget) {
        gl.activeTexture(textureTarget);
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
    };
};


