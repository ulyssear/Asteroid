(() => {
  // src/game.js
  Array.prototype.chunk = function(chunkSize) {
    var array = this;
    return [].concat.apply([], array.map(function(elem, i) {
      return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
    }));
  };
  var paused = false;
  var debug = true;
  var animation_dying = false;
  var canvas = document.querySelector("canvas");
  var ctx = canvas.getContext("2d");
  var soundShipFire = new Audio("sounds/ship_fire.wav");
  var soundShipExplosion = new Audio("sounds/ship_explosion.wav");
  var soundAsteroidExplosion = new Audio("sounds/explosion.wav");
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  var Entity = class {
    static DEFAULT() {
      return {
        name: "Un nom",
        position: [
          canvas.width / 2,
          canvas.height / 2
        ],
        points: [],
        clones: {
          left: false,
          right: false,
          top: false,
          bottom: false
        },
        velocity: null,
        rotationVelocity: null,
        rotation: null,
        size: 30,
        color: "white",
        friction: 0.965,
        isClone: false,
        mayCollapse: false
      };
    }
    constructor(params = {}) {
      params = Object.assign(Ship.DEFAULT(), params);
      for (let key in params)
        this[key] = params[key];
      this.id = this.id ?? Math.random().toString(16).slice(3);
    }
    setColor(color) {
      this.color = color;
    }
  };
  var Ship = class extends Entity {
    static DEFAULT() {
      return {
        name: "Joueur",
        speed: 0,
        bullets: [],
        canFire: true,
        canRotate: true,
        velocity: [0, 0]
      };
    }
    constructor(params = {}) {
      super(params);
      params = {
        ...Entity.DEFAULT(),
        ...Ship.DEFAULT(),
        ...params
      };
      for (let key in params)
        this[key] = params[key];
      this.points = [
        [-this.size / 3, this.size / 3],
        [0, -this.size / 2],
        [this.size / 3, this.size / 3]
      ];
      this.rotation = -90;
      this.draw();
    }
    draw() {
      drawEntity(this);
      try {
        this.bullets.forEach((bullet) => {
          bullet.move();
          if (isOutOfCanvas(bullet.position)) {
            this.bullets.splice(this.bullets.indexOf(bullet), 1);
            return;
          }
          bullet.draw();
        });
      } catch (error) {
        console.error(error);
      }
    }
    rotateLeft() {
      if (!this.canRotate)
        return;
      const angle = 4;
      this.rotationVelocity = -angle * Math.PI / 180;
      this.rotation = (this.rotation - angle) % 360;
      rotate(this);
    }
    rotateRight() {
      if (!this.canRotate)
        return;
      const angle = 4;
      this.rotationVelocity = angle * Math.PI / 180;
      this.rotation = (this.rotation + angle) % 360;
      rotate(this);
    }
    accelerate() {
      this.speed += 0.45;
      this.velocity = [this.speed * Math.cos(this.rotation * Math.PI / 180), this.speed * Math.sin(this.rotation * Math.PI / 180)];
      const decimals = 5 * 10;
      this.velocity = [Math.round(this.velocity[0] * decimals) / decimals, Math.round(this.velocity[1] * decimals) / decimals];
      this.speed = Math.round(this.speed * decimals) / decimals;
    }
    move() {
      let [vx, vy] = this.velocity.map((e) => e * this.friction);
      this.position = translatePoints([this.position], this.velocity)[0];
      this.speed *= this.friction;
      this.velocity = [Math.round(vx * 1e3) / 1e3, Math.round(vy * 1e3) / 1e3];
      this.speed = Math.round(this.speed * 1e3) / 1e3;
      if (this.speed < 0.02) {
        this.speed = 0;
        this.velocity = [0, 0];
      }
    }
    fire() {
      if (!this.canFire)
        return;
      this.canFire = false;
      let bullet;
      const { position, rotation } = this;
      bullet = new Bullet({ position, rotation });
      this.bullets.push(bullet);
      playSoundShipFire();
    }
    explode() {
      if (!this.isDead)
        playSoundShipExplosion();
      this.isDead = true;
      this.canFire = false;
      this.canRotate = false;
      animation_dying = true;
    }
  };
  var Bullet = class extends Entity {
    static DEFAULT() {
      return {
        friction: 1,
        speed: 5,
        points: [[0, 0]]
      };
    }
    constructor(params = {}) {
      super(params);
      params = {
        ...Entity.DEFAULT(),
        ...Bullet.DEFAULT(),
        ...params
      };
      for (let key in params)
        this[key] = params[key];
      this.velocity = [Math.cos(this.rotation * Math.PI / 180) * this.speed, Math.sin(this.rotation * Math.PI / 180) * this.speed];
      this.draw();
    }
    move() {
      this.position = translatePoints([this.position], this.velocity)[0];
      this.velocity = this.velocity.map((e) => e * this.friction);
      this.speed = Math.sqrt(this.velocity[0] ** 2 + this.velocity[1] ** 2);
    }
    draw() {
      const [x, y] = this.position;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  var Asteroid = class extends Entity {
    static DEFAULT() {
      return {
        friction: 1,
        size: null,
        position: null,
        rotation: null,
        velocity: null
      };
    }
    constructor(params = {}) {
      super(params);
      params = {
        ...Entity.DEFAULT(),
        ...Asteroid.DEFAULT(),
        ...params
      };
      for (let key in params)
        this[key] = params[key];
      this.size = this.size ?? Math.floor(Math.random() * 8 + 5);
      this.angle = this.angle ?? Math.random() * 360;
      this.position = this.position ?? [Math.round(Math.random() * (canvas.width - 400) + 200), Math.round(Math.random() * (canvas.height - 400) + 200)];
      this.rotation = this.rotation ?? Math.floor(Math.random() * 360);
      this.velocity = this.velocity ?? [Math.cos(this.rotation * Math.PI / 180) * 1, Math.sin(this.rotation * Math.PI / 180) * 1];
      this.rotationVelocity = this.rotationVelocity ?? 6e-4;
      this.points = 1 > this.points.length || !this.points ? this.createPoints() : this.points;
      this.clones = this.clones ?? {
        left: false,
        right: false,
        top: false,
        bottom: false
      };
    }
    createPoints() {
      const points = [];
      const { angle, size } = this;
      const angleStep = 360 / this.size;
      for (let i = 0; i < this.size; i++) {
        const _angle = angle + angleStep * i;
        const _x = Math.cos(_angle * Math.PI / 180) * size * 6.5 - Math.cos(_angle * Math.PI / 180) * Math.random() * this.size * 3.45;
        const _y = Math.sin(_angle * Math.PI / 180) * size * 6.5 - Math.sin(_angle * Math.PI / 180) * Math.random() * this.size * 3.45;
        points.push([_x, _y]);
      }
      return points;
    }
    move() {
      this.position = translatePoints([this.position], this.velocity)[0];
      this.rotate();
    }
    explode() {
      if (this.size / 2 > 6) {
        const { position } = this;
        let _points = sortPoints([...this.points]).chunk(6);
        _points = _points.map((points, i) => {
          const prev = (i - 1 + _points.length) % _points.length;
          const next = (i + 1) % _points.length;
          const prevLast = _points[prev][_points[prev].length - 1];
          const nextFirst = _points[next][0];
          return [...points, prevLast, nextFirst];
        });
        _points = _points.map((points) => [[0, 0], ...points]).map((points) => points.map((point) => [point[0] + position[0], point[1] + position[1]]));
        const _centers = _points.map((points) => getCenterPolygon(points));
        _points = _points.map((points, i) => points.map((point) => [point[0] - _centers[i][0], point[1] - _centers[i][1]]));
        _points = _points.map((points) => sortPoints(points));
        for (let i = 0; i < _points.length; i++) {
          const _asteroid = new Asteroid({
            size: this.size - 1,
            points: _points[i],
            position: _centers[i],
            rotation: this.rotation,
            rotationVelocity: this.rotationVelocity,
            velocity: rotatePoint(this.velocity, 360 / _points.length * i)
          });
          asteroids.push(_asteroid);
        }
      }
      playSoundAsteroidExplosion();
      asteroids.splice(asteroids.indexOf(this), 1);
    }
    draw() {
      try {
        drawEntity(this);
      } catch (error) {
        console.log(error);
      }
    }
    rotate() {
      this.points = this.points.map((point) => rotatePoint(point, this.rotationVelocity));
    }
    static generate(n = 1, asteroids2 = []) {
      if (n > 0) {
        const asteroid = new Asteroid();
        const isColliding = false;
        if (!isColliding) {
          asteroids2.push(asteroid);
          return Asteroid.generate(n - 1, asteroids2);
        }
        return Asteroid.generate(n, asteroids2);
      }
      return asteroids2;
    }
    static generateAt(n, position) {
      const asteroids2 = [];
      for (let i = 0; i < n; i++) {
        const asteroid = new Asteroid({ position });
        asteroids2.push(asteroid);
      }
      return asteroids2;
    }
  };
  function checkBoundaries(entity) {
    const clones = entity.clones ?? {
      left: false,
      right: false,
      top: false,
      bottom: false,
      d_top_left: false,
      d_top_right: false,
      d_bottom_left: false,
      d_bottom_right: false
    };
    const [cx, cy] = entity.position;
    for (let i = 0; i < entity.points.length; i++) {
      const [x0, y0] = entity.points[i];
      const bounds = {
        left: x0 + cx <= 0,
        right: x0 + cx >= canvas.width,
        top: y0 + cy <= 0,
        bottom: y0 + cy >= canvas.height
      };
      if (Object.values(bounds).reduce((a, b) => a || b)) {
        for (let bound in bounds)
          if (bounds[bound])
            clones[bound] = bounds[bound];
      }
    }
    if (clones.left && clones.top)
      clones.d_top_left = true;
    if (clones.right && clones.top)
      clones.d_top_right = true;
    if (clones.left && clones.bottom)
      clones.d_bottom_left = true;
    if (clones.right && clones.bottom)
      clones.d_bottom_right = true;
    entity.clones = clones;
  }
  function drawLine([cx, cy], [x1, y1], [x2, y2], color) {
    ctx.beginPath();
    ctx.moveTo(x1 + cx, y1 + cy);
    ctx.lineTo(x2 + cx, y2 + cy);
    ctx.strokeStyle = color;
    ctx.stroke();
  }
  function drawPoint(size, [x, y], color) {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
  }
  function translatePoints(points, [dx, dy]) {
    return points.map(([x, y]) => [x + dx, y + dy]);
  }
  function updateOutOfBounds(entity) {
    const { clones, position, points } = entity;
    const [cx, cy] = position;
    if (Object.values(clones).includes(true)) {
      const key = Object.keys(clones).find((key2) => clones[key2]);
      const [dx, dy] = {
        left: [canvas.width, 0],
        right: [-canvas.width, 0],
        top: [0, canvas.height],
        bottom: [0, -canvas.height],
        d_top_left: [canvas.width, canvas.height],
        d_top_right: [-canvas.width, canvas.height],
        d_bottom_left: [canvas.width, -canvas.height],
        d_bottom_right: [-canvas.width, -canvas.height]
      }[key];
      const isFullyOutOfBounds = points.map(([x, y]) => [x + cx, y + cy]).map(isOutOfCanvas).reduce((a, b) => a && b);
      if (isFullyOutOfBounds) {
        entity.position = translatePoints([position], [dx, dy])[0];
        entity.clones[key] = false;
      }
    }
  }
  function getClonesPositions(entity) {
    let clonesPositions = {};
    const translations = {
      left: [canvas.width, 0],
      right: [-canvas.width, 0],
      top: [0, canvas.height],
      bottom: [0, -canvas.height],
      d_top_left: [canvas.width, canvas.height],
      d_top_right: [-canvas.width, canvas.height],
      d_bottom_left: [canvas.width, -canvas.height],
      d_bottom_right: [-canvas.width, -canvas.height]
    };
    for (const bound in translations) {
      if (entity.clones[bound]) {
        clonesPositions[bound] = translatePoints([entity.position], translations[bound])[0];
      }
    }
    return clonesPositions;
  }
  function rotate(entity) {
    entity.points = genericRotate(entity.points, entity.rotationVelocity);
  }
  function genericRotate(points, rotationVelocity = 0) {
    return points.map((point) => rotatePoint(point, rotationVelocity));
  }
  function rotatePoint([x, y], rotation = 0) {
    return [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)].map((e) => Math.floor(e * 1e3) / 1e3);
  }
  function drawEntity(entity) {
    try {
      entity.move();
      checkBoundaries(entity);
      updateOutOfBounds(entity);
      _drawEntity(entity);
      const clonesPositions = getClonesPositions(entity);
      for (const bound in clonesPositions) {
        const position = clonesPositions[bound];
        _drawEntity({ ...entity, position });
      }
    } catch (error) {
      console.error(error);
    }
  }
  function _drawEntity(entity) {
    const { rotation, position, speed } = entity;
    const [x, y] = position;
    if (position.length !== 2)
      console.debug({ another_position: position });
    ctx.beginPath();
    if (debug) {
      ctx.moveTo(...position);
      ctx.lineTo(x + Math.cos(rotation * Math.PI / 180) * (2 * speed), y + Math.sin(rotation * Math.PI / 180) * (2 * speed));
      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let i = 0; i < entity.points.length; i++) {
      const [x1, y1] = entity.points[i];
      const [x2, y2] = entity.points[(i + 1) % entity.points.length];
      drawLine(position, [x1, y1], [x2, y2], entity.color);
      if (debug)
        drawPoint(3, [x1 + x, y1 + y], "red");
    }
  }
  function isOutOfCanvas([x, y]) {
    return x < 0 || x > canvas.width || y < 0 || y > canvas.height;
  }
  function collision(entity1, entity2) {
    const [x1, y1] = entity1.position;
    const [x2, y2] = entity2.position;
    entity1.mayCollapse = true;
    entity2.mayCollapse = true;
    const points1 = entity1.points.map(([x, y]) => [x + x1, y + y1]);
    const points2 = entity2.points.map(([x, y]) => [x + x2, y + y2]);
    if (points1.length === 1) {
      points1.push([points1[0][0] + entity1.velocity[0], points1[0][1] + entity1.velocity[1]]);
    }
    if (points2.length === 1) {
      points2.push([points2[0][0] + entity2.velocity[0], points2[0][1] + entity2.velocity[1]]);
    }
    for (let i = 0; i < points1.length; i++) {
      const point1a = points1[i].map((e, i2) => e + entity1.velocity[i2]);
      const point1b = points1[(i + 1) % points1.length].map((e, i2) => e + entity1.velocity[i2]);
      for (let j = 0; j < points2.length; j++) {
        const point2a = points2[j].map((e, i2) => e + entity2.velocity[i2]);
        const point2b = points2[(j + 1) % points2.length].map((e, i2) => e + entity2.velocity[i2]);
        if (isIntersecting(point1a, point1b, point2a, point2b)) {
          return true;
        }
      }
      entity1.mayCollapse = false;
      entity2.mayCollapse = false;
      return false;
    }
  }
  function isIntersecting(point1, point2, point3, point4) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    const [x3, y3] = point3;
    const [x4, y4] = point4;
    const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denominator == 0) {
      return false;
    }
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
  function getCenterPolygon(points) {
    let x = 0;
    let y = 0;
    for (const [x1, y1] of points) {
      x += x1;
      y += y1;
    }
    return [x / points.length, y / points.length];
  }
  function sortPoints(points) {
    const center = getCenterPolygon(points);
    return points.sort((a, b) => {
      const [x1, y1] = a;
      const [x2, y2] = b;
      const angle1 = Math.atan2(y1 - center[1], x1 - center[0]);
      const angle2 = Math.atan2(y2 - center[1], x2 - center[0]);
      return angle1 - angle2;
    });
  }
  function playSoundShipFire() {
    soundShipFire.currentTime = 0;
    soundShipFire.play();
  }
  function playSoundAsteroidExplosion() {
    soundAsteroidExplosion.currentTime = 0;
    soundAsteroidExplosion.volume = 0.5;
    soundAsteroidExplosion.play();
  }
  function playSoundShipExplosion() {
    soundShipExplosion.currentTime = 0;
    soundShipExplosion.play();
  }
  var ship = new Ship();
  var asteroids = Asteroid.generate(0);
  var controls = {
    "rotate left": {
      keys: ["ArrowLeft", "q", "Q"],
      action: ship.rotateLeft
    },
    "rotate right": {
      keys: ["ArrowRight", "d", "D"],
      action: ship.rotateRight
    },
    "accelerate": {
      keys: ["ArrowUp", "z", "Z"],
      action: ship.accelerate
    },
    "fire": {
      keys: ["Enter", " "],
      action: ship.fire
    },
    "pause": {
      keys: ["p"],
      action: () => {
        paused = !paused;
      },
      canOnPause: true
    },
    debug: {
      keys: ["m", "M"],
      action: () => {
        debug = !debug;
      },
      canOnPause: true
    }
  };
  for (let key in controls) {
    controls[key].canOnPause = controls[key].canOnPause ?? false;
    controls[key].lastTimeUsed = null;
  }
  var keysPressed = {};
  window.addEventListener("keyup", (e) => {
    delete keysPressed[e.key];
    if (!animation_dying && controls.fire.keys.every((value) => !Object.keys(keysPressed).includes(value)))
      ship.canFire = true;
  });
  window.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
  });
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    asteroids.push(new Asteroid({
      position: [x, y],
      size: 13
    }));
  });
  var lastTime = Date.now();
  var draw = () => {
    try {
      for (let keyPressed in keysPressed) {
        for (let control in controls) {
          if (controls[control].keys.includes(keyPressed)) {
            if (!paused || paused && controls[control].canOnPause) {
              if (["pause", "debug"].includes(control)) {
                if (Date.now() - controls[control].lastTimeUsed > 100) {
                  controls[control].action.bind(ship)();
                  controls[control].lastTimeUsed = Date.now();
                }
              } else {
                controls[control].action.bind(ship)();
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (paused) {
      requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    asteroids.forEach((asteroid) => {
      let _asteroids = [asteroid];
      _asteroids.push(...Object.values(getClonesPositions(asteroid)).map((position) => {
        return { ...asteroid, position };
      }));
      if (animation_dying && asteroid.velocity !== [0, 0]) {
        asteroid.velocity = [0, 0];
        asteroid.rotationVelocity = 0;
      }
      _asteroids.forEach((_asteroid) => {
        if (collision(ship, _asteroid)) {
          ship.explode();
        }
        ship.bullets.forEach((bullet) => {
          if (collision(bullet, _asteroid)) {
            asteroid.explode();
            ship.bullets.splice(ship.bullets.indexOf(bullet), 1);
          }
        });
      });
      asteroid.draw();
    });
    if (animation_dying && ship.velocity !== [0, 0]) {
      ship.speed = 0;
      ship.velocity = [0, 0];
      ship.rotationVelocity = 0;
    }
    ship.draw();
    if (debug) {
      ctx.font = "24px VT323";
      ctx.fillStyle = "white";
      ctx.fillText(`FPS: ${Math.round(1e3 / (Date.now() - lastTime))}`, 10, 20);
      ctx.fillStyle = "white";
      ctx.font = "13px VT323";
      ctx.fillText(`${ship.position}`, 10, 40);
      ctx.fillText(`${ship.speed}`, 10, 55);
      if (ship.bullets[0])
        ctx.fillText(`${ship.bullets[0].position}`, 10, 70);
      ctx.fillText(`Asteroids : ${asteroids.length}`, 10, 85);
    }
    lastTime = Date.now();
    requestAnimationFrame(draw);
  };
  draw();
})();
