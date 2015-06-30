var PLAYER_SPEED = 250;
var PLAYER_JUMP = 750;
var PLANET_GRAVITY = 2000;

Planetary = function(width, height, container) {
    if (width === undefined) {
        width = 800;
    }
    if (height === undefined) {
        height = 600;
    }
    if (container === undefined) {
        container = '';
    }
    this.game = new Phaser.Game(width, height, Phaser.AUTO, container);
    this.game.state.add('Planetary', this, true);
};

Planetary.prototype = {
    preload: function() {
        this.load.image('planet', 'assets/planet.png');
        this.load.image('spaceman', 'assets/spaceman.png');
    },

    create: function() {
        this.physics.startSystem(Phaser.Physics.P2JS);
        this.physics.p2.setImpactEvents(true);

        var planetImg = this.game.cache.getImage('planet');
        this.planet = this.game.add.sprite(0, 0, 'planet');

        var spacemanImg = this.game.cache.getImage('spaceman');
        var spacemanY = -((planetImg.height / 2) + (spacemanImg.height * 2));
        this.spaceman = this.game.add.sprite(0, spacemanY, 'spaceman');

        this.physics.p2.enable([ this.planet, this.spaceman ]);

        this.planet.body.motionState = Phaser.Physics.P2.Body.STATIC;
        this.planet.body.setCircle(this.planet.width / 2);

        this.spacemanLanded = false;
        this.spaceman.body.motionState = Phaser.Physics.P2.Body.DYNAMIC;
        this.spaceman.body.setRectangleFromSprite(this.spaceman);
        this.spaceman.body.fixedRotation = true;

        this.physics.p2.setBounds(-1000, -1000, 2000, 2000);
        this.camera.bounds = null;

        this.cursors = this.input.keyboard.createCursorKeys();
        this.cursorUpPrev = false;

        // Add collision groups
        this.planetColGroup = this.physics.p2.createCollisionGroup();
        this.planet.body.setCollisionGroup(this.planetColGroup);
        this.spacemanColGroup = this.physics.p2.createCollisionGroup();
        this.spaceman.body.setCollisionGroup(this.spacemanColGroup);
        this.spaceman.body.collides(this.planetColGroup, function(spaceman, planet) { this.spacemanLanded = true; }, this);
        this.planet.body.collides(this.spacemanColGroup);
    },

    applyPlanetGravity: function(sprite, gravity) {
        var gravity = new Phaser.Point(sprite.x, sprite.y).normalize().multiply(-gravity, -gravity);
        sprite.body.force.x = gravity.x;
        sprite.body.force.y = gravity.y;
    },

    update: function() {
        // Handle input
        var spacemanAngle = Phaser.Point.angle(this.spaceman.position, this.planet.position) + (Math.PI / 2);
        var velPoint = new Phaser.Point(this.spaceman.body.velocity.x,
                                        this.spaceman.body.velocity.y);
        var radialProj = this.spaceman.position.clone();
        var tangProj = radialProj.clone().perp();
        var radialComp = Phaser.Point.project(velPoint, radialProj);
        var tangSpeed = PLAYER_SPEED * (this.spaceman.position.getMagnitude() / (this.planet.width / 2));
        if (this.cursors.left.isDown) {
            tangComp = tangProj.clone().normalize().multiply(-tangSpeed, -tangSpeed);
        } else if (this.cursors.right.isDown) {
            tangComp = tangProj.clone().normalize().multiply(tangSpeed, tangSpeed);
        } else {
            tangComp = new Phaser.Point(0, 0);
        }
        if (this.cursors.up.isDown && !this.cursorUpPrev && this.spacemanLanded) {
            radialComp = Phaser.Point.add(radialComp, radialProj.clone().normalize().multiply(PLAYER_JUMP, PLAYER_JUMP));
            this.spacemanLanded = false;
        }
        this.cursorUpPrev = this.cursors.up.isDown;
        var velFinal = Phaser.Point.add(radialComp, tangComp);
        this.spaceman.body.velocity.x = velFinal.x;
        this.spaceman.body.velocity.y = velFinal.y;
        // Done with input

        this.applyPlanetGravity(this.spaceman, PLANET_GRAVITY);
        this.spaceman.rotation = this.spaceman.body.rotation = spacemanAngle;

        this.world.pivot = new Phaser.Point(
            this.spaceman.x,
            this.spaceman.y
        ).normalize().multiply(this.planet.width / 2, this.planet.height / 2);
        this.world.rotation = -this.spaceman.rotation;
        this.camera.focusOnXY(0, -150);
    }
};
