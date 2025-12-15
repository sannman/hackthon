
def main():
    user_subject = input("Enter the subject: ")
    user_prority = input("High , Medium , Low:")
    user_time_available = int(input("Enter the time available (in hours): "))

    priority_levels = {
        "High": 3,
        "Medium": 2,
        "Low": 1
    }

    time_multiplier = {
        1: 10,
        2:9,
        3:8,
        4:7,
        5:5,
        6:4,
        7:3,
        8:2,
        9:1,
        10:0.9
    }
    base_score = priority_levels.get(user_prority, 0) * 10
    time_score = time_multiplier.get(user_time_available, 0)
    total_score = base_score + time_score
    print(f"Study Plan for {user_subject}:")
    print(f"Priority Level: {user_prority}")
    print(f"Time Available: {user_time_available} hours")
    print(f"Total Study Score: {total_score}")

main()