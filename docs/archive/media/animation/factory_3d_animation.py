"""
3D Factory Animation for Cooperative IoT Monitor
Renders a 3D factory scene and saves as MP4.
"""

import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import subprocess
import os

# Settings
FPS = 30
DURATION = 10  # shorter for testing
FRAMES = FPS * DURATION
OUTPUT_MP4 = '/home/hamza/Documents/github/cooperative-iot-monitor/animation/factory_animation.mp4'

# Factory dimensions
FLOOR_X, FLOOR_Y = 20, 15

def draw_factory_frame(ax, t):
    """Draw one frame of the factory at time t (seconds)"""
    ax.cla()
    ax.set_xlim(0, FLOOR_X)
    ax.set_ylim(0, FLOOR_Y)
    ax.set_zlim(0, 10)
    ax.set_facecolor('black')
    ax.set_title(f'Cooperative IoT Monitor - T={t:.1f}s', color='white', fontsize=10)
    ax.tick_params(colors='white')

    # Floor
    floor_corners = [[0,0,0],[FLOOR_X,0,0],[FLOOR_X,FLOOR_Y,0],[0,FLOOR_Y,0]]
    ax.add_collection3d(Poly3DCollection([floor_corners], color='gray', alpha=0.3))

    # Conveyor belts (3 lines)
    for y, color in zip([3, 7, 11], ['red', 'blue', 'green']):
        ax.plot([3, 17], [y, y], [0.1, 0.1], color=color, linewidth=4, alpha=0.7)
        # Moving items
        for i in range(3):
            phase = ((t * 0.5 + i/3) % 1.0)
            x = 3 + phase * 14
            ax.scatter([x], [y], [0.3], color=color, s=60)

    # Assembly stations
    stations = [(5,3), (10,3), (15,3), (5,7), (10,7), (15,7), (5,11), (10,11), (15,11)]
    for (x, y) in stations:
        # Station box
        s = 0.8
        z = 0.5
        corners = [
            [x-s/2, y-s/2, z], [x+s/2, y-s/2, z], [x+s/2, y+s/2, z], [x-s/2, y+s/2, z],
            [x-s/2, y-s/2, z+s], [x+s/2, y-s/2, z+s], [x+s/2, y+s/2, z+s], [x-s/2, y+s/2, z+s]
        ]
        faces = [
            [corners[0], corners[1], corners[2], corners[3]],
            [corners[4], corners[5], corners[6], corners[7]],
            [corners[0], corners[1], corners[5], corners[4]],
            [corners[2], corners[3], corners[7], corners[6]],
            [corners[1], corners[2], corners[6], corners[5]],
            [corners[0], corners[3], corners[7], corners[4]],
        ]
        ax.add_collection3d(Poly3DCollection(faces, color='orange', alpha=0.6))
        # Moving robot arm
        arm_z = z + s + 0.3 * np.sin(2 * np.pi * t * 0.5 + x)
        ax.plot([x, x], [y, y], [z+s, arm_z], color='white', linewidth=2)

    # IoT Sensors (12 nodes)
    np.random.seed(42)
    for i in range(12):
        x = 2 + (i % 4) * 4 + (i // 4) * 0.5
        y = 2 + (i // 4) * 3 + (i % 4) * 0.3
        z = 1.5
        # Simulated temperature
        temp = 20 + 10 * np.sin(2 * np.pi * t * 0.1 + i)
        r = min(1.0, max(0, (temp - 20) / 30))
        b = 1.0 - r
        ax.scatter([x], [y], [z], color=(r, 0, b), s=40)
        if i < 4:  # Show text for first few sensors
            ax.text(x, y, z+0.3, f'S{i}:{temp:.0f}°', color='white', fontsize=6, ha='center')

    # Data flow particles to dashboard
    for i in range(4):
        phase = ((t * 0.3 + i * 0.25) % 1.0)
        sx = 2 + i * 4
        sy = 2 + i * 3
        px = sx + (18.75 - sx) * phase
        py = sy + (0.5 - sy) * phase
        pz = 1.5 + (3.5 - 1.5) * phase
        ax.scatter([px], [py], [pz], color='cyan', s=10, alpha=0.6)

    # Dashboard
    db_corners = [[18, 0.5, 2], [19.5, 0.5, 2], [19.5, 0.5, 4.5], [18, 0.5, 4.5]]
    ax.add_collection3d(Poly3DCollection([db_corners], color='darkblue', alpha=0.8))
    ax.text(18.75, 0.5, 3.5, 'Dashboard', color='white', fontsize=7, ha='center')

    # Rotate view
    ax.view_init(elev=20, azim=(t * 10) % 360)

def animate():
    """Generate animation frames and save to MP4"""
    fig = plt.figure(figsize=(10, 7))
    ax = fig.add_subplot(111, projection='3d')

    print(f"Rendering {FRAMES} frames...")

    def update(frame):
        t = frame / FPS
        draw_factory_frame(ax, t)
        return []

    ani = animation.FuncAnimation(fig, update, frames=FRAMES, blit=False)
    writer = animation.FFMpegWriter(fps=FPS, bitrate=1800)
    ani.save(OUTPUT_MP4, writer=writer)
    plt.close(fig)
    print(f"Saved to {OUTPUT_MP4}")
    # Check file
    if os.path.exists(OUTPUT_MP4):
        size = os.path.getsize(OUTPUT_MP4)
        print(f"File size: {size/1024/1024:.1f} MB")
        # Get duration with ffprobe
        try:
            result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                    '-of', 'default=noprint_wrappers=1:nokey=1', OUTPUT_MP4],
                                   capture_output=True, text=True)
            print(f"Duration: {result.stdout.strip()} seconds")
        except:
            pass
    else:
        print("ERROR: Output file not created")

if __name__ == '__main__':
    animate()
