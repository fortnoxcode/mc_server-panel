import pidusage from "pidusage";
export const processUsage = async (socket, process, time) => {

    const compute = async (process) => {
      const stats = await pidusage(process.pid);
      socket.emit('pidusage', {
        cpu: `${Math.round(stats.cpu)} %`,
        ram: `${Math.round(stats.memory / 1e+6)} MB/s`,
        uptime: `${stats.elapsed / 1000} s`
      })
    }
      setTimeout(async () => {
        try {
          await compute(process);
          processUsage(socket, process, time);
        } catch (error) {
          socket.emit('pidusage', {cpu: 0, ram: 0, uptime: 0})
        }
      }, time);
  }