from manim import *

class MESAnimation(Scene):
    def construct(self):
        # Title
        title = Text("Cooperative IoT Monitor - MES", font_size=48, color=WHITE)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(0.5)

        # Components
        # ESP32 / Simulator
        esp32 = Rectangle(width=2.5, height=1.5, fill_color=BLUE, fill_opacity=0.7, stroke_color=WHITE)
        esp32_label = Text("ESP32 / Simulator", font_size=20, color=WHITE)
        esp32_label.next_to(esp32, DOWN, buff=0.2)
        sensor_text = Text("temperature\nhumidity\nweight\nflow", font_size=14, color=YELLOW)
        sensor_text.move_to(esp32.get_center())
        esp32_group = VGroup(esp32, esp32_label, sensor_text)
        esp32_group.to_edge(LEFT, buff=1)

        # MQTT Broker
        mqtt = Circle(radius=1, fill_color=GREEN, fill_opacity=0.7, stroke_color=WHITE)
        mqtt_label = Text("MQTT Broker\n(Mosquitto)", font_size=18, color=WHITE)
        mqtt_label.next_to(mqtt, DOWN, buff=0.2)
        topic_text = Text("cooperative/device/\n+/sensor/+", font_size=12, color=WHITE)
        topic_text.move_to(mqtt.get_center())
        mqtt_group = VGroup(mqtt, mqtt_label, topic_text)
        mqtt_group.move_to(ORIGIN)

        # FastAPI Backend
        backend = Square(side_length=1.8, fill_color=ORANGE, fill_opacity=0.7, stroke_color=WHITE)
        backend_label = Text("FastAPI Backend", font_size=20, color=WHITE)
        backend_label.next_to(backend, DOWN, buff=0.2)
        backend_text = Text("MQTT Subscriber\nSQLAlchemy\nREST API", font_size=14, color=WHITE)
        backend_text.move_to(backend.get_center())
        backend_group = VGroup(backend, backend_label, backend_text)
        backend_group.to_edge(RIGHT, buff=1).shift(UP * 1.5)

        # Database
        database = Cylinder(radius=0.8, height=1.2, fill_color=PURPLE, fill_opacity=0.7, stroke_color=WHITE)
        database_label = Text("Database\n(SQLite/PostgreSQL)", font_size=16, color=WHITE)
        database_label.next_to(database, DOWN, buff=0.2)
        db_text = Text("sensor_readings\nusers", font_size=12, color=WHITE)
        db_text.move_to(database.get_center())
        database_group = VGroup(database, database_label, db_text)
        database_group.to_edge(RIGHT, buff=1).shift(DOWN * 1.5)

        # React Frontend
        frontend = Rectangle(width=2.5, height=1.5, fill_color=RED, fill_opacity=0.7, stroke_color=WHITE)
        frontend_label = Text("React Dashboard", font_size=20, color=WHITE)
        frontend_label.next_to(frontend, DOWN, buff=0.2)
        ui_text = Text("Live Charts\nHistory\nPredictions", font_size=14, color=WHITE)
        ui_text.move_to(frontend.get_center())
        frontend_group = VGroup(frontend, frontend_label, ui_text)
        frontend_group.to_edge(UP, buff=3).shift(RIGHT * 2)

        # Animate components appearing
        self.play(
            Create(esp32_group),
            Create(mqtt_group),
            Create(backend_group),
            Create(database_group),
            Create(frontend_group),
        )
        self.wait(1)

        # Data flow arrows
        # ESP32 to MQTT
        arrow1 = Arrow(esp32.get_right(), mqtt.get_left(), buff=0.1, color=YELLOW, stroke_width=4)
        arrow1_label = Text("MQTT Publish", font_size=14, color=YELLOW).next_to(arrow1, UP, buff=0.1)

        # MQTT to Backend
        arrow2 = Arrow(mqtt.get_right(), backend.get_left(), buff=0.1, color=YELLOW, stroke_width=4)
        arrow2_label = Text("Persist", font_size=14, color=YELLOW).next_to(arrow2, UP, buff=0.1)

        # Backend to Database
        arrow3 = Arrow(backend.get_bottom(), database.get_top(), buff=0.1, color=YELLOW, stroke_width=4)
        arrow3_label = Text("SQL", font_size=14, color=YELLOW).next_to(arrow3, RIGHT, buff=0.1)

        # MQTT to Frontend (WebSocket)
        arrow4 = Arrow(mqtt.get_top(), frontend.get_bottom(), buff=0.1, color=CYAN, stroke_width=4)
        arrow4_label = Text("WebSocket", font_size=14, color=CYAN).next_to(arrow4, LEFT, buff=0.1)

        # Backend to Frontend (REST API)
        arrow5 = Arrow(backend.get_top(), frontend.get_right(), buff=0.1, color=CYAN, stroke_width=4)
        arrow5_label = Text("REST API", font_size=14, color=CYAN).next_to(arrow5, RIGHT, buff=0.1)

        # Animate arrows
        self.play(GrowArrow(arrow1), Write(arrow1_label))
        self.play(GrowArrow(arrow2), Write(arrow2_label))
        self.play(GrowArrow(arrow3), Write(arrow3_label))
        self.play(GrowArrow(arrow4), Write(arrow4_label))
        self.play(GrowArrow(arrow5), Write(arrow5_label))
        self.wait(1)

        # Animate data packets
        data_packet = Dot(color=YELLOW, radius=0.15)

        # ESP32 to MQTT
        packet1 = data_packet.copy()
        self.play(packet1.animate.move_to(esp32.get_right()))
        self.play(MoveAlongPath(packet1, arrow1), run_time=1)
        self.play(packet1.animate.scale(0.5).move_to(mqtt.get_center()))
        self.wait(0.3)

        # MQTT to Backend
        packet2 = data_packet.copy()
        self.play(packet2.animate.move_to(mqtt.get_right()))
        self.play(MoveAlongPath(packet2, arrow2), run_time=1)
        self.play(packet2.animate.scale(0.5).move_to(backend.get_center()))
        self.wait(0.3)

        # Backend to Database
        packet3 = data_packet.copy()
        self.play(packet3.animate.move_to(backend.get_bottom()))
        self.play(MoveAlongPath(packet3, arrow3), run_time=1)
        self.play(packet3.animate.scale(0.5).move_to(database.get_center()))
        self.wait(0.3)

        # MQTT to Frontend (WebSocket)
        packet4 = Dot(color=CYAN, radius=0.15)
        self.play(packet4.animate.move_to(mqtt.get_top()))
        self.play(MoveAlongPath(packet4, arrow4), run_time=1)
        self.play(packet4.animate.scale(0.5).move_to(frontend.get_center()))
        self.wait(0.5)

        # Summary text
        summary = VGroup(
            Text("Real-time Cooperative IoT Monitoring", font_size=28, color=WHITE),
            Text("ESP32 → MQTT → Backend → Database", font_size=20, color=YELLOW),
            Text("MQTT → Frontend (WebSocket) | Backend → Frontend (REST)", font_size=18, color=CYAN),
        ).arrange(DOWN, buff=0.3)
        summary.to_edge(DOWN, buff=0.5)

        self.play(FadeOut(packet1), FadeOut(packet2), FadeOut(packet3), FadeOut(packet4))
        self.play(Write(summary))
        self.wait(3)

        # Fade out everything
        self.play(*[FadeOut(mob) for mob in self.mobjects])
        self.wait(0.5)

        # Final message
        final_text = Text("Smart Manufacturing\nwith Real-time Monitoring", font_size=48, color=GREEN)
        self.play(Write(final_text))
        self.wait(2)
