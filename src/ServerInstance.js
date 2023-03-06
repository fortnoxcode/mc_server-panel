export class ServerInstance {
    constructor(servName, servCore) {
        this.servName = servName.toString();
        this.servCore = servCore.toString();
        this.SERVER_FOLDER = `./${this.servName}`
        this.JAR = this.servCore;
        this.JAR_PATH = `./assets/${this.JAR}`;
        this.SERVER_JAR = `${this.SERVER_FOLDER}/${this.JAR}`
        this.EULA_SERVER_PATH = `${this.SERVER_FOLDER}/eula.txt`;

    }
}
