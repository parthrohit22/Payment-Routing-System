from flask import Flask
from utils import api_response
from payments import payments_bp
from auth import auth_bp

app = Flask(__name__)

app.register_blueprint(payments_bp)
app.register_blueprint(auth_bp)


@app.route("/health", methods=["GET"])
def health():
    return api_response(data={"status": "ok"}, message="Backend reachable")

if __name__ == "__main__":
    app.run(debug=True)
