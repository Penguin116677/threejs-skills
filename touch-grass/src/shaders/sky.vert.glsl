varying vec3 vDir;

void main() {
  vDir = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec4 clip = projectionMatrix * viewMatrix * world;
  gl_Position = clip.xyww; // pin to the far plane
}
