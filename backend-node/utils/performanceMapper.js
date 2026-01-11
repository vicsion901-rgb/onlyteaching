export function mapPerformance(level) {
    switch (level) {
      case "우수":
        return "성취기준을 충실히 이해하고 자신의 생각을 확장하여 적용함";
      case "보통":
        return "성취기준을 이해하고 과제를 성실히 수행함";
      case "기초":
        return "성취기준 이해에 도움이 필요함";
      default:
        return "";
    }
  }