Lab.Curves = Lab.Curves || {};

Lab.Curves = function () {
    this.quad = null;
    this.curvesTex = null;
    this.drawShader = null;
    this.updateShader = null;
    this.cvs = [];
    this.cds = [];
    this.curveCount = 0;

    /* Curves: 
     *   - Each curve is represented by two 2D points (head & tail)
     *   - To render curves, a single quad is splatted in world space
     *   - For each fragment in the shader (x,y) it iterates over every
     *     vec4 (c) in the curve set, where c.xy is the head and c.zw is the tail
     *   - If (x,y) is in the rectange(c.x, c.y, c.z, c.w), the curve is evaluated
     *   - As an optimization, the width of the curve at point t can also be 
     *     used to cull curve evaluations
     *   - An additional vec4 is used to provide phase shift, velocity, amplitude
     *     and the maximum curve width
     */

    this._drawQuad = function(gl, shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
        gl.vertexAttribPointer(shader.prog.vertex,this.quad.itemSize,gl.FLOAT,false,0,0)
        gl.enableVertexAttribArray(shader.prog.vertex);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buff);
        gl.drawArrays(gl.TRIANGLES, 0, this.quad.length);
    };

    this.init = function(gl, drawShader, updateShader) {
        if (this.quad) gl.deleteBuffer(this.quad);
        this.drawShader = drawShader;
        this.updateShader = updateShader;

        this.quad = Lab.Geom.makeQuad2D(gl);

        this.curvesTex = new Lab.PingPongBuffer(this.curveCount, 2, null); //updateShader.prog.tex0);
        this.curvesTex.init(gl, new Float32Array(this.cvs.concat(this.cds)));

        // temp: move _dst -> _src
        this.curvesTex.swap();

        delete this.curves;
    };

    this.update = function(gl, time, dt) {
        this.updateShader.bind(gl);
        this.curvesTex.bind(gl);

        this._drawQuad(gl, this.updateShader);

        this.curvesTex.unbind(gl);
        this.curvesTex.swap();
    };

    this.draw = function(gl, time) {
        this.drawShader.bind(gl);

        // bind the curve data input
        gl.uniform1i(this.drawShader.prog.tex0, 0);
        gl.uniform1f(this.drawShader.prog.time, time);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.curvesTex._dst);
        
        this._drawQuad(gl, this.drawShader);
    };

    //                   head , tail, state 
    this.push = function(x0,y0,x1,y1, phase, amp, velocity, width) {
        this.cvs.push(x0);
        this.cvs.push(y0);
        this.cvs.push(x1);
        this.cvs.push(y1);

        this.cds.push(phase);
        this.cds.push(amp);
        this.cds.push(velocity);
        this.cds.push(width);
        
        this.curveCount++;
    };


};
