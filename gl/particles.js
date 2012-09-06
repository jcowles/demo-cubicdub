
/* simple dynamics:
    create 2 or 3 fields:
        - position
        - velocity
        - acceleration
    The elements of each field represent a single particle
    
    to update position, the existing position is combined with the velocity field
    to update velocity, the existing velocity is combined with the acceleration field

    the acceleration field is slightly different:
        - bake a texture of noise (just once)
        - use position to sample the baked noise field

    setup:
        - create two fields (loc, vel)
        - initialize loc texture to initial positions
        - initialize vel texture to initial velocities
        - bake a perlin noise texture (accel)
 */

Lab.ParticleField = Lab.ParticleField || {};

Lab.ParticleField = function(width, height) {
    this.pos = null;
    this.vel = null;
    this.accel = null;
    this.attract = null;

    this.width = width;
    this.height = height;
    
    this.init = function(gl, posShader, velShader, positions, velocities, accelerations) {
        this.pos = new Lab.Field(this.width, this.height);
        this.pos.init(gl, posShader, positions);
        this.vel = new Lab.Field(this.width, this.height);
        this.vel.init(gl, velShader, velocities);
        //this.accel = new Lab.Field(this.width, this.height);
        //this.accel.init(gl, accelShader, accelerations);
        //accelShader.checkVars([ "mode", "tex0", "tex1", "tex2" ], [ "vertex" ]);
        this.accel = new Lab.Fbo(this.width, this.height, gl.NEAREST);
        this.accel.init(gl, accelerations);

        this.attract = new Lab.Fbo(this.width, this.height, gl.NEAREST);
        this.attract.init(gl);

        posShader.checkVars([ "mode", "tex0", "tex1", "tex2", "tex3" ], [ "vertex" ]);
        velShader.checkVars([ "mode", "tex0", "tex1", "tex2", "tex3", "doAttract" ], [ "vertex" ]);
    };

    this.update = function(gl, time, dt, attract) {
        this.vel.shader.bind(gl);
        // set mode to velocity
        gl.uniform1i(this.vel.shader.prog.mode, 1);

        // bind the acceleration texture as input
        gl.uniform1i(this.vel.shader.prog.tex1, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.accel.tex);

        // bind the position texture as input
        gl.uniform1i(this.vel.shader.prog.tex2, 2);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.getPosTex());

        // bind the attraction texture as input
        gl.uniform1i(this.vel.shader.prog.doAttract, attract ? 1 : 0);
        gl.uniform1i(this.vel.shader.prog.tex3, 3);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.attract.tex);


        // update: vel[i] = vel[i-1] + accel[pos[i]]
        this.vel.update(gl, time, dt);


        this.pos.shader.bind(gl);

        // set mode to position 
        gl.uniform1i(this.pos.shader.prog.mode, 0);

        // bind the velocity texture as input
        gl.uniform1i(this.pos.shader.prog.tex1, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.vel.getTex());

        // update: pos[i] = pos[i-1] + vel[i]
        this.pos.update(gl, time, dt);

    };

    this.getPosTex = function() {
        return this.pos._pp._src;
    };
};

