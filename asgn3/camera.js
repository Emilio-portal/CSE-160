'use strict';

class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([16, 1.5, 20]);
    this.at  = new Vector3([16, 1.5, 19]);
    this.up  = new Vector3([0, 1, 0]);
    this.viewMatrix = new Matrix4();
    this.projMatrix = new Matrix4();
    this.updateView();
    this.updateProjection();
  }

  updateView() {
    let e = this.eye.elements, a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0],e[1],e[2], a[0],a[1],a[2], u[0],u[1],u[2]);
  }

  updateProjection() {
    this.projMatrix.setPerspective(this.fov, canvas.width/canvas.height, 0.1, 1000);
  }

  moveForward(speed=0.2) {
    let f = new Vector3(); f.set(this.at); f.sub(this.eye); f.normalize(); f.mul(speed);
    this.eye.add(f); this.at.add(f);
    this.updateView();
  }

  moveBackward(speed=0.2) {
    let b = new Vector3(); b.set(this.eye); b.sub(this.at); b.normalize(); b.mul(speed);
    this.eye.add(b); this.at.add(b);
    this.updateView();
  }

  moveLeft(speed=0.2) {
    let f = new Vector3(); f.set(this.at); f.sub(this.eye); f.normalize();
    let s = Vector3.cross(this.up, f); s.normalize(); s.mul(speed);
    this.eye.add(s); this.at.add(s);
    this.updateView();
  }

  moveRight(speed=0.2) {
    let f = new Vector3(); f.set(this.at); f.sub(this.eye); f.normalize();
    let s = Vector3.cross(f, this.up); s.normalize(); s.mul(speed);
    this.eye.add(s); this.at.add(s);
    this.updateView();
  }

  panLeft(deg=5) {
    let f = new Vector3(); f.set(this.at); f.sub(this.eye);
    let rot = new Matrix4();
    rot.setRotate(deg, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fp = rot.multiplyVector3(f);
    let e = this.eye.elements;
    this.at.elements[0] = e[0] + fp.elements[0];
    this.at.elements[1] = e[1] + fp.elements[1];
    this.at.elements[2] = e[2] + fp.elements[2];
    this.updateView();
  }

  panRight(deg=5) { this.panLeft(-deg); }

  // mouse look: dx rotates horizontally, dy tilts vertically
  rotateByMouse(dx, dy) {
    this.panLeft(-dx * 0.2);
    // vertical tilt
    let f = new Vector3(); f.set(this.at); f.sub(this.eye);
    let right = Vector3.cross(f, this.up); right.normalize();
    let rot = new Matrix4();
    rot.setRotate(-dy * 0.2, right.elements[0], right.elements[1], right.elements[2]);
    let fp = rot.multiplyVector3(f);
    let e = this.eye.elements;
    this.at.elements[0] = e[0] + fp.elements[0];
    this.at.elements[1] = e[1] + fp.elements[1];
    this.at.elements[2] = e[2] + fp.elements[2];
    this.updateView();
  }
}
