from flask import Flask, g
from utils import api_response, get_request_identity
from payments import payments_bp
from auth import auth_bp

app = Flask(__name__)

app.register_blueprint(payments_bp)
app.register_blueprint(auth_bp)


@app.before_request
def attach_user():
    identity, _ = get_request_identity()
    g.user = identity


@app.route("/health", methods=["GET"])
def health():
    return api_response(data={"status": "ok"}, message="Backend reachable")


if __name__ == "__main__":
    app.run(debug=True)